import { describe, expect, it } from "vitest";
import { buildCustomRequestEmail } from "@/lib/email/custom-request-template";
import { customRequestSchema } from "./schema";
import { customRequestWhatsAppUrl } from "./whatsapp";

const valid = {
  name: "Ana Souza",
  email: "Ana@Example.com ",
  phone: "(31) 99999-0000",
  description: "Um molde oval de 20 cm para travessa.",
  website: "",
};

describe("customRequestSchema", () => {
  it("aceita e normaliza", () => {
    const r = customRequestSchema.parse(valid);
    expect(r.email).toBe("ana@example.com");
    expect(r.phone).toBe("31999990000");
  });

  it("telefone é opcional", () => {
    expect(customRequestSchema.parse({ ...valid, phone: "" }).phone).toBe("");
  });

  it("nome com quebra de linha vira uma linha só (não injeta cabeçalho)", () => {
    const r = customRequestSchema.parse({ ...valid, name: "Ana\r\nBcc: x@y.com" });
    expect(r.name).not.toMatch(/[\r\n]/);
  });

  it("honeypot preenchido é recusado", () => {
    expect(customRequestSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });

  it("descrição curta demais é recusada", () => {
    expect(customRequestSchema.safeParse({ ...valid, description: "oi" }).success).toBe(false);
  });
});

describe("customRequestWhatsAppUrl", () => {
  it("abre o WhatsApp do ateliê com a mensagem escrita", () => {
    const url = new URL(
      customRequestWhatsAppUrl({ reference: "AB12CD34", name: "Ana", description: "Molde oval" }),
    );
    expect(url.origin + url.pathname).toBe("https://wa.me/5531986460734");
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain("nº AB12CD34");
    expect(text).toContain("Molde oval");
  });

  it("resume descrições longas", () => {
    const url = new URL(
      customRequestWhatsAppUrl({ reference: "X", name: "Ana", description: "a".repeat(3000) }),
    );
    expect((url.searchParams.get("text") ?? "").length).toBeLessThan(800);
  });
});

describe("buildCustomRequestEmail", () => {
  it("escapa o texto do cliente", () => {
    const { html } = buildCustomRequestEmail({
      reference: "X",
      name: "<b>Ana</b>",
      email: "a@b.com",
      phone: "",
      description: "<script>alert(1)</script>",
      photoCount: 0,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>Ana</b>");
  });
});
