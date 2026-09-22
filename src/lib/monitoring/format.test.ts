import { describe, expect, it } from "vitest";
import {
  buildAlertEmail,
  errorInfo,
  fingerprint,
  normalizeForFingerprint,
  stripQuery,
  truncate,
} from "./format";

describe("errorInfo", () => {
  it("extrai nome, mensagem, stack curto e digest de um Error", () => {
    const err = Object.assign(new TypeError("falhou"), { digest: "123abc" });
    const info = errorInfo(err);
    expect(info).toMatchObject({ name: "TypeError", message: "falhou", digest: "123abc" });
    expect(info.stack?.split("\n").length).toBeLessThanOrEqual(8);
  });

  it("aceita valores que não são Error", () => {
    expect(errorInfo("texto")).toMatchObject({ name: "NonError", message: "texto" });
    expect(errorInfo(null)).toMatchObject({ name: "NonError", message: "null" });
  });

  it("corta mensagens gigantes", () => {
    expect(errorInfo(new Error("x".repeat(2000))).message.length).toBeLessThanOrEqual(501);
  });
});

describe("stripQuery", () => {
  it.each([
    ["/pedido/abc?pagamento=retorno", "/pedido/abc"],
    ["/entrar?next=/conta&email=maria@x.com", "/entrar"],
    ["/produtos#topo", "/produtos"],
    ["/", "/"],
  ])("%s -> %s", (path, expected) => {
    expect(stripQuery(path)).toBe(expected);
  });
});

describe("truncate", () => {
  it("só corta o que passa do limite", () => {
    expect(truncate("abc", 5)).toBe("abc");
    expect(truncate("abcdef", 3)).toBe("abc…");
  });
});

describe("fingerprint", () => {
  it("é estável e curto", () => {
    expect(fingerprint("a", "b")).toBe(fingerprint("a", "b"));
    expect(fingerprint("a", "b")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("mesmo erro em pedidos diferentes vira UM alerta", () => {
    expect(fingerprint("create_order", "pedido 3f2a1b4c-1111-4222-8333-444455556666 falhou")).toBe(
      fingerprint("create_order", "pedido 9e8d7c6b-aaaa-4bbb-8ccc-ddddeeeeffff falhou"),
    );
    expect(fingerprint("webhook", "pagamento 123456789")).toBe(
      fingerprint("webhook", "pagamento 987654321"),
    );
  });

  it("erros diferentes não se misturam", () => {
    expect(fingerprint("create_order", "timeout")).not.toBe(fingerprint("startPayment", "timeout"));
    expect(fingerprint("a", "b|c")).not.toBe(fingerprint("a", "b"));
  });

  it("normaliza UUIDs e números longos, mas mantém números curtos", () => {
    expect(normalizeForFingerprint("erro 42 no pedido 1234567")).toBe("erro 42 no pedido <n>");
  });
});

describe("buildAlertEmail", () => {
  const now = new Date("2026-09-22T22:30:00Z");

  it("escapa HTML vindo da mensagem de erro (conteúdo controlado por terceiros)", () => {
    const { html } = buildAlertEmail(
      {
        kind: "error",
        title: '<img src=x onerror="alert(1)">',
        details: { erro: "<script>alert(1)</script>" },
        stack: "at <b>x</b>",
      },
      now,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("assunto sem quebra de linha (evita injeção de cabeçalho) e com prefixo por tipo", () => {
    const erro = buildAlertEmail(
      { kind: "error", title: "falhou\r\nBcc: x@y.com", details: {} },
      now,
    );
    expect(erro.subject).toBe("[Empoeirar] Erro: falhou Bcc: x@y.com");
    const negocio = buildAlertEmail({ kind: "business", title: "duplicado", details: {} }, now);
    expect(negocio.subject).toBe("[Empoeirar] Atenção: duplicado");
  });

  it("mostra horário de Brasília e omite campos vazios", () => {
    const { html } = buildAlertEmail(
      { kind: "error", title: "t", details: { pedido: "abc", digest: undefined, vazio: "" } },
      now,
    );
    expect(html).toContain("22/09/2026, 19:30:00");
    expect(html).toContain("pedido");
    expect(html).not.toContain("digest");
    expect(html).not.toContain("vazio");
  });
});
