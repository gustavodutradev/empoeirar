import type { OrderStatus } from "@/lib/checkout/status";

/**
 * Decide o que um pagamento do Mercado Pago faz com o pedido. Função PURA: o
 * webhook busca o pedido e o pagamento, chama isto e só executa a decisão.
 *
 * Por que não é mais um simples "status do MP -> status do pedido":
 * um pedido pode ter VÁRIOS pagamentos (cartão recusado, Pix que expirou,
 * depois um cartão aprovado), e o MP notifica cada um, fora de ordem e com
 * reenvios. Olhar só o status do pagamento fazia:
 *  - cartão recusado cancelar o pedido (o cliente não conseguia tentar de novo);
 *  - um Pix abandonado que expira depois cancelar um pedido já pago no cartão;
 *  - um reenvio de "pending" voltar um pedido pago para "aguardando pagamento".
 *
 * Regras:
 *  1. Só um pagamento APROVADO move o pedido para frente, e só a partir de
 *     "aguardando pagamento", com valor igual ao total do pedido.
 *  2. Pagamento que falhou (recusado, cancelado, expirado) ou que ainda está
 *     em andamento não mexe no pedido. Ele segue aguardando e o cliente pode
 *     pagar de novo.
 *  3. Estorno/chargeback só cancela o pedido se for do pagamento que PAGOU o
 *     pedido (customer_order.mp_payment_id).
 *  4. O que precisa de gente (pagamento duplicado, pago depois de cancelado,
 *     disputa, valor divergente) é ignorado com `alert: true`, para o webhook
 *     registrar como erro e alguém resolver à mão.
 */

export type OrderSnapshot = {
  status: string;
  /** Pagamento que confirmou o pedido; null enquanto não foi pago. */
  mpPaymentId: string | null;
  totalCents: number;
};

export type PaymentSnapshot = {
  id: string;
  status: string;
  amountCents: number;
};

export type IgnoreReason =
  | "payment_in_progress"
  | "payment_failed"
  | "already_paid"
  | "already_cancelled"
  | "refund_of_other_payment"
  | "duplicate_payment"
  | "paid_after_cancel"
  | "amount_mismatch"
  | "in_mediation"
  | "unknown_status";

export type PaymentDecision =
  | {
      action: "advance";
      to: OrderStatus;
      note: string;
      /** Gravar como o pagamento do pedido (só ao confirmar). */
      paymentId: string | null;
    }
  | { action: "ignore"; reason: IgnoreReason; alert: boolean };

/** Status do pedido em que ele já está pago (inclui as etapas posteriores). */
const PAID_OR_LATER: ReadonlySet<string> = new Set(["paid", "preparing", "shipped", "delivered"]);

const ignore = (reason: IgnoreReason, alert = false): PaymentDecision => ({
  action: "ignore",
  reason,
  alert,
});

export function decidePaymentTransition(
  order: OrderSnapshot,
  payment: PaymentSnapshot,
): PaymentDecision {
  switch (payment.status) {
    case "approved": {
      if (order.status === "pending_payment") {
        // Impede que um pagamento menor "confirme" um pedido mais caro.
        if (payment.amountCents !== order.totalCents) return ignore("amount_mismatch", true);
        return {
          action: "advance",
          to: "paid",
          note: "Pagamento aprovado.",
          paymentId: payment.id,
        };
      }
      if (PAID_OR_LATER.has(order.status)) {
        // Mesmo pagamento de novo = reenvio do MP. Outro pagamento = cliente
        // pagou duas vezes: alguém precisa estornar um deles.
        return payment.id === order.mpPaymentId
          ? ignore("already_paid")
          : ignore("duplicate_payment", true);
      }
      // Dinheiro entrou num pedido cancelado: reativar ou estornar é decisão
      // humana (o cancelamento pode ter sido por falta de material, por exemplo).
      return ignore("paid_after_cancel", true);
    }

    case "refunded":
    case "charged_back": {
      if (payment.id !== order.mpPaymentId) return ignore("refund_of_other_payment");
      if (order.status === "cancelled") return ignore("already_cancelled");
      return {
        action: "advance",
        to: "cancelled",
        note:
          payment.status === "refunded"
            ? "Pagamento estornado."
            : "Pagamento contestado junto ao cartão.",
        paymentId: null,
      };
    }

    case "pending":
    case "in_process":
    case "authorized":
      return ignore("payment_in_progress");

    case "rejected":
    case "cancelled":
      return ignore("payment_failed");

    case "in_mediation":
      // Cliente abriu disputa no MP: não muda o pedido, mas o Jane precisa saber.
      return ignore("in_mediation", true);

    default:
      return ignore("unknown_status", true);
  }
}
