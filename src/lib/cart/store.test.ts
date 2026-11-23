import { describe, expect, it } from "vitest";
import { migrateCart } from "./store";

const v1Item = {
  variantId: "v1",
  productSlug: "oval",
  productName: "Oval",
  variantLabel: "G",
  priceCents: 6_000,
  quantity: 2,
};

describe("migrateCart", () => {
  it("v1 -> v2: preço único vira Pix e cartão iguais (até sincronizar)", () => {
    const out = migrateCart({ items: [v1Item], ownerId: "u1" }, 1);
    expect(out.ownerId).toBe("u1");
    expect(out.items[0]).toMatchObject({
      pixPriceCents: 6_000,
      cardPriceCents: 6_000,
      quantity: 2,
    });
    expect(out.items[0]).not.toHaveProperty("priceCents");
  });

  it("estado vazio ou corrompido vira carrinho vazio", () => {
    expect(migrateCart(undefined, 1)).toEqual({ items: [], ownerId: null });
    expect(migrateCart({ items: "x" }, 1)).toEqual({ items: [], ownerId: null });
  });
});
