/**
 * Preços no Pix e no cartão. Funções puras, usadas no carrinho, no checkout e
 * na vitrine. Fonte da verdade continua o banco: aqui só se soma o que já veio
 * de lá.
 */

export type PaymentMethod = "pix" | "card";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  card: "Cartão",
};

export type DualPriced = { pixPriceCents: number; cardPriceCents: number };

export function priceFor(item: DualPriced, method: PaymentMethod): number {
  return method === "pix" ? item.pixPriceCents : item.cardPriceCents;
}

/** Subtotal dos itens nas duas formas. */
export function cartTotals(items: readonly (DualPriced & { quantity: number })[]): {
  pixCents: number;
  cardCents: number;
} {
  let pixCents = 0;
  let cardCents = 0;
  for (const i of items) {
    pixCents += i.pixPriceCents * i.quantity;
    cardCents += i.cardPriceCents * i.quantity;
  }
  return { pixCents, cardCents };
}
