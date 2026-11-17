import { describe, expect, it } from "vitest";
import { buildOrderEmail, type OrderEmailData } from "./templates";

const data: OrderEmailData = {
  id: "00000000-0000-4000-8000-000000000001",
  shortId: "00000000",
  customerName: "Ana Souza",
  subtotalCents: 10000,
  shippingCents: 1000,
  totalCents: 11000,
  address: {
    street: "Rua A",
    number: "1",
    complement: "",
    district: "União",
    city: "Belo Horizonte",
    state: "MG",
    cep: "31170193",
  },
  items: [{ name: "Régua", variant: "3 mm", quantity: 1, lineTotalCents: 10000 }],
  siteUrl: "https://empoeirar.com.br",
};

describe("buildOrderEmail — rastreio", () => {
  it("e-mail de enviado leva o link do Melhor Rastreio quando há código", () => {
    const { html } = buildOrderEmail("shipped", { ...data, trackingCode: "AA123456789BR" });
    expect(html).toContain("https://www.melhorrastreio.com.br/rastreio/AA123456789BR");
  });

  it("sem código, nada de rastreio", () => {
    const { html } = buildOrderEmail("shipped", { ...data, trackingCode: null });
    expect(html).not.toContain("melhorrastreio");
  });

  it("outros status não mostram rastreio mesmo com código", () => {
    const { html } = buildOrderEmail("paid", { ...data, trackingCode: "AA123456789BR" });
    expect(html).not.toContain("melhorrastreio");
  });
});
