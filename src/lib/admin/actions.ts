"use server";

import { ORDER_STATUS, type OrderStatus } from "@/lib/checkout/status";
import { sendOrderStatusEmail } from "@/lib/email/order-notification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const VALID_STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

/**
 * Muda o status de um pedido (ação de admin).
 *
 * Fronteira de confiança:
 *  1. getUser — precisa estar logado.
 *  2. is_admin() no banco — precisa SER admin (nunca confia na UI).
 *  3. só então usa o cliente service_role para chamar advance_order_status
 *     (idempotente), que registra o evento na linha do tempo do cliente.
 */
export async function adminAdvanceOrder(orderId: string, status: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  if (!VALID_STATUSES.includes(status as OrderStatus)) {
    return { ok: false, error: "Status inválido." };
  }

  const admin = createAdminClient();
  const { data: changed, error } = await admin.rpc("advance_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: ORDER_STATUS[status as OrderStatus].description,
    p_mp_payment_id: null,
  });

  if (error) {
    console.error("[adminAdvanceOrder]", error.message);
    return { ok: false, error: "Não foi possível atualizar o status." };
  }

  // Notifica o cliente só quando o status muda de fato (não em re-clique no
  // mesmo status). sendOrderStatusEmail ignora status fora do escopo v1.
  if (changed === true) {
    await sendOrderStatusEmail(orderId, status);
  }

  return { ok: true };
}
