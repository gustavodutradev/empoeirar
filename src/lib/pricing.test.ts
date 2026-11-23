import { describe, expect, it } from "vitest";
import { cartTotals, priceFor } from "./pricing";

describe("pricing", () => {
  const item = { pixPriceCents: 14_900, cardPriceCents: 16_100 };

  it("priceFor escolhe pela forma", () => {
    expect(priceFor(item, "pix")).toBe(14_900);
    expect(priceFor(item, "card")).toBe(16_100);
  });

  it("cartTotals soma as duas formas com quantidade", () => {
    expect(
      cartTotals([
        { ...item, quantity: 2 },
        { pixPriceCents: 5_000, cardPriceCents: 5_400, quantity: 1 },
      ]),
    ).toEqual({ pixCents: 34_800, cardCents: 37_600 });
  });

  it("carrinho vazio soma zero", () => {
    expect(cartTotals([])).toEqual({ pixCents: 0, cardCents: 0 });
  });
});
