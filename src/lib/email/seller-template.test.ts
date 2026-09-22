import { describe, expect, it } from "vitest";
import { buildSellerOrderEmail, type SellerOrderEmailData } from "./seller-template";

const base: SellerOrderEmailData = {
  id: "3f2a1b4c-1111-4222-8333-444455556666",
  shortId: "3F2A1B4C",
  createdAt: "2026-09-22T22:30:00Z",
  customerName: "Maria da Silva",
  subtotalCents: 14000,
  shippingCents: 1900,
  shippingService: "Correios PAC",
  totalCents: 15900,
  address: {
    street: "Av. Afonso Pena",
    number: "1000",
    complement: "apto 12",
    district: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    cep: "30130010",
  },
  items: [{ name: "Puxador Banana", variant: "M", quantity: 2, lineTotalCents: 14000 }],
  siteUrl: "https://empoeirar.com.br",
  testMode: false,
};

describe("buildSellerOrderEmail", () => {
  it("assunto com número e total, sem dados do cliente", () => {
    const { subject } = buildSellerOrderEmail(base);
    expect(subject).toBe("Nova venda! Pedido nº 3F2A1B4C — R$ 159,00");
    expect(subject).not.toContain("Maria");
  });

  it("traz o necessário para despachar e o link do admin", () => {
    const { html } = buildSellerOrderEmail(base);
    expect(html).toContain("2×</strong> Puxador Banana");
    expect(html).toContain("Correios PAC");
    expect(html).toContain("Maria da Silva");
    expect(html).toContain("apto 12");
    expect(html).toContain("CEP 30130010");
    expect(html).toContain(
      'href="https://empoeirar.com.br/admin/pedidos/3f2a1b4c-1111-4222-8333-444455556666"',
    );
    // Horário de Brasília (testes rodam em UTC).
    expect(html).toContain("22/09/2026, 19:30");
  });

  it("escapa HTML vindo do cliente (nome, endereço)", () => {
    const { html } = buildSellerOrderEmail({
      ...base,
      customerName: '<img src=x onerror="alert(1)">',
      address: { ...base.address, street: "<script>x</script>" },
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("frete a calcular quando não houve cotação", () => {
    const { html } = buildSellerOrderEmail({ ...base, shippingCents: null, shippingService: null });
    expect(html).toContain("a calcular");
  });

  it("fora de produção marca como TESTE no assunto e no corpo", () => {
    const { subject, html } = buildSellerOrderEmail({ ...base, testMode: true });
    expect(subject.startsWith("[TESTE] ")).toBe(true);
    expect(html).toContain("Não despachar");
    expect(buildSellerOrderEmail(base).html).not.toContain("Não despachar");
  });
});
