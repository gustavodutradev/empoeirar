"use server";

import { z } from "zod";
import { isOrderStatus, ORDER_STATUS } from "@/lib/checkout/status";
import { canAdminTransition, isBackwardMove } from "@/lib/checkout/transitions";
import { sendOrderStatusEmail } from "@/lib/email/order-notification";
import { reportError } from "@/lib/monitoring/report";
import { normalizeTrackingCode } from "@/lib/shipping/tracking";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Muda o status de um pedido (ação de admin).
 *
 * Fronteira de confiança:
 *  1. getUser — precisa estar logado.
 *  2. is_admin() no banco — precisa SER admin (nunca confia na UI).
 *  3. A transição precisa ser permitida (canAdminTransition), a partir do
 *     status ATUAL lido no banco, não do que a tela mostrava.
 *  4. advance_order_status com p_expected_status: se um webhook (estorno, por
 *     exemplo) mudou o pedido entre a leitura e a escrita, nada é gravado.
 */
export async function adminAdvanceOrder(orderId: string, status: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  if (!isOrderStatus(status)) {
    return { ok: false, error: "Status inválido." };
  }

  const admin = createAdminClient();
  const { data: order, error: readError } = await admin
    .from("customer_order")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (readError) {
    await reportError("adminAdvanceOrder: leitura", readError.message, { pedido: orderId });
    return { ok: false, error: "Não foi possível atualizar o status." };
  }
  if (!order || !isOrderStatus(order.status)) {
    return { ok: false, error: "Pedido não encontrado." };
  }

  const current = order.status;
  if (!canAdminTransition(current, status)) {
    return { ok: false, error: "Essa mudança de status não é permitida." };
  }

  const { data: changed, error } = await admin.rpc("advance_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: ORDER_STATUS[status].description,
    p_mp_payment_id: null,
    p_expected_status: current,
  });

  if (error) {
    await reportError("adminAdvanceOrder", error.message, { pedido: orderId, status });
    return { ok: false, error: "Não foi possível atualizar o status." };
  }

  if (changed !== true) {
    // Outro processo mudou o pedido entre a leitura e a escrita.
    return { ok: false, error: "O pedido mudou enquanto você editava. Recarregue a página." };
  }

  // Notifica o cliente só em avanço real. Desfazer uma etapa (ex.: Entregue ->
  // Enviado) não reenvia o e-mail que ele já recebeu. sendOrderStatusEmail
  // ainda ignora status fora do escopo dos e-mails.
  if (!isBackwardMove(current, status)) {
    await sendOrderStatusEmail(orderId, status);
  }

  return { ok: true };
}

/**
 * Grava (ou apaga, com texto vazio) o código de rastreio do pedido.
 *
 * A autorização está no banco: set_order_tracking é SECURITY DEFINER e checa
 * is_admin() lá dentro. O check aqui só evita a chamada e dá uma mensagem
 * melhor. O código é normalizado aqui e de novo no banco.
 */
export async function adminSetTrackingCode(orderId: string, code: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };

  const raw = typeof code === "string" ? code.slice(0, 80) : "";
  const normalized = raw.trim() === "" ? null : normalizeTrackingCode(raw);
  if (raw.trim() !== "" && !normalized) {
    return { ok: false, error: "Código inválido. Use só letras e números (5 a 40)." };
  }

  const { error } = await supabase.rpc("set_order_tracking", {
    p_order_id: orderId,
    p_code: normalized,
  });
  if (error) {
    await reportError("adminSetTrackingCode", error.message, { pedido: orderId });
    return { ok: false, error: "Não foi possível salvar o código." };
  }
  return { ok: true };
}
