import { describe, expect, it } from "vitest";
import { createOrderInputSchema } from "./schema";

const base = {
  customer: {
    full_name: "  Maria da Silva  ",
    cpf: "529.982.247-25",
    phone: "(31) 98888-7777",
    email: "maria@example.com",
  },
  address: {
    cep: "30130-010",
    street: "Av. Afonso Pena",
    number: "1000",
    district: "Centro",
    city: "Belo Horizonte",
    state: "mg",
  },
  items: [{ variantId: "0b0c3c1e-4f5a-4b6c-8d7e-9f0a1b2c3d4e", quantity: 2 }],
};

describe("createOrderInputSchema", () => {
  it("normaliza máscaras, espaços e UF", () => {
    const out = createOrderInputSchema.parse(base);
    expect(out.customer).toMatchObject({
      full_name: "Maria da Silva",
      cpf: "52998224725",
      phone: "31988887777",
    });
    expect(out.address).toMatchObject({ cep: "30130010", state: "MG", complement: "" });
  });

  // O preço é sempre recalculado no servidor. Se o cliente mandar um campo de
  // preço, ele precisa sumir na validação, e não chegar à server action.
  it("descarta preço enviado pelo cliente", () => {
    const out = createOrderInputSchema.parse({
      ...base,
      items: [{ ...base.items[0], priceCents: 1 }],
      shippingCents: 0,
    });
    expect(out.items[0]).not.toHaveProperty("priceCents");
    expect(out).not.toHaveProperty("shippingCents");
  });

  it.each([
    ["CPF inválido", { customer: { ...base.customer, cpf: "529.982.247-24" } }],
    ["carrinho vazio", { items: [] }],
    ["quantidade zero", { items: [{ ...base.items[0], quantity: 0 }] }],
    ["quantidade fracionada", { items: [{ ...base.items[0], quantity: 1.5 }] }],
    ["quantidade acima do limite", { items: [{ ...base.items[0], quantity: 100 }] }],
    ["variantId que não é UUID", { items: [{ variantId: "1 OR 1=1", quantity: 1 }] }],
    ["CEP curto", { address: { ...base.address, cep: "3013001" } }],
    ["UF com 3 letras", { address: { ...base.address, state: "MGG" } }],
    ["e-mail inválido", { customer: { ...base.customer, email: "maria@" } }],
  ])("rejeita: %s", (_name, override) => {
    expect(createOrderInputSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });
});
