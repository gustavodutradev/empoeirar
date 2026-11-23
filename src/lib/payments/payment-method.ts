/**
 * Regras puras sobre o meio de pagamento (sem chamar o Mercado Pago), para
 * poderem ser testadas e usadas fora do servidor.
 */

/** Meio de pagamento, do jeito que importa para o preço: Pix ou não-Pix. */
export type PaymentMethodKind = "pix" | "card" | "other";

const CARD_TYPES = new Set(["credit_card", "debit_card", "prepaid_card"]);

/** Classifica o meio do pagamento do MP. Pix no MP: método "pix", tipo "bank_transfer". */
export function paymentMethodKind(
  methodId: string | null | undefined,
  typeId: string | null | undefined,
): PaymentMethodKind {
  if (methodId === "pix" || typeId === "bank_transfer") return "pix";
  if (typeId && CARD_TYPES.has(typeId)) return "card";
  return "other";
}

/**
 * Tipos de pagamento que o Checkout Pro NÃO deve oferecer, por forma escolhida.
 * Pix: só Pix. Cartão: crédito, débito e saldo/crédito do MP; sem Pix (que tem
 * preço próprio) e sem boleto.
 * É conforto de interface: a trava de verdade é o webhook, que recusa pedido
 * de Pix pago com outro meio.
 */
export const EXCLUDED_PAYMENT_TYPES: Record<"pix" | "card", string[]> = {
  pix: ["credit_card", "debit_card", "prepaid_card", "ticket", "atm", "account_money"],
  card: ["bank_transfer", "ticket", "atm"],
};
