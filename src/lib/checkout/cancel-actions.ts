"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { decideUnpaidOrder } from "@/lib/checkout/expiration";
import { reportError } from "@/lib/monitoring/report";
import { isMercadoPagoConfigured, searchPaymentsByOrder } from "@/lib/payments/mercadopago";
import { allowRequest } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/**
 * O cliente cancela o PRÓPRIO pedido enquanto ele ainda não foi pago (item 26).
 *
 * Fronteira de confiança:
 *  1. getUser: precisa estar logado.
 *  2. O pedido é lido com o cliente do USUÁRIO (sob RLS): pedido alheio volta
 *     vazio, então não há como cancelar pedido de outra pessoa (anti-IDOR).
 *  3. Só "aguardando pagamento". E não cancela se o Mercado Pago tiver
 *     pagamento aprovado ou em andamento (boleto/Pix gerado): o cliente pode
 *     ter pago e não ter visto a confirmação ainda.
 *  4. Só então o cliente service_role chama advance_order_status com
 *     p_expected_status: se o webhook confirmou o pagamento nesse meio-tempo,
 *     o cancelamento não acontece.
 */
export async function cancelMyOrder(orderId: string): Promise<Result> {
  if (!z.uuid().safeParse(orderId).success) {
    return { ok: false, error: "Pedido inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Você precisa estar logado." };

  if (!(await allowRequest(supabase, `cancel-order:${user.id}`, 10, 60))) {
    return { ok: false, error: "Muitas tentativas. Aguarde um instante e tente de novo." };
  }

  const { data: order } = await supabase
    .from("customer_order")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  // Mesma mensagem para "não existe" e "não é seu": não revela se o id existe.
  if (!order) return { ok: false, error: "Pedido não encontrado." };
  if (order.status !== "pending_payment") {
    return { ok: false, error: "Só é possível cancelar pedidos que ainda não foram pagos." };
  }

  if (isMercadoPagoConfigured()) {
    let payments: { status: string }[];
    try {
      payments = await searchPaymentsByOrder(order.id);
    } catch (err) {
      // Na dúvida, não cancela: pode haver pagamento que não conseguimos ver.
      await reportError("cancelMyOrder: consulta ao MP", err, { pedido: order.id });
      return { ok: false, error: "Não foi possível cancelar agora. Tente novamente." };
    }
    if (decideUnpaidOrder(payments) !== "cancel") {
      return {
        ok: false,
        error:
          "Há um pagamento em processamento para este pedido. Aguarde a confirmação; se ele não for aprovado, o pedido é cancelado automaticamente.",
      };
    }
  }

  const admin = createAdminClient();
  const { data: changed, error } = await admin.rpc("advance_order_status", {
    p_order_id: order.id,
    p_status: "cancelled",
    p_note: "Cancelado por você.",
    p_mp_payment_id: null,
    p_expected_status: "pending_payment",
  });

  if (error) {
    await reportError("cancelMyOrder", error.message, { pedido: order.id });
    return { ok: false, error: "Não foi possível cancelar agora. Tente novamente." };
  }
  if (changed !== true) {
    // O status mudou entre a leitura e a gravação (ex.: o pagamento foi
    // confirmado agora). Não cancela.
    return { ok: false, error: "O status do pedido mudou. Atualize a página." };
  }

  revalidatePath(`/pedido/${order.id}`);
  revalidatePath("/conta");
  return { ok: true };
}
