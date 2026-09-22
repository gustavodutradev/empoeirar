import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/checkout", "/checkout"],
    ["/pedido/3f2a?pagamento=retorno", "/pedido/3f2a?pagamento=retorno"],
    ["/produtos#topo", "/produtos#topo"],
    ["/", "/"],
  ])("mantém caminho interno %j", (next, expected) => {
    expect(safeRedirectPath(next)).toBe(expected);
  });

  it.each([
    ["URL absoluta", "https://site-falso.com"],
    ["protocol-relative", "//site-falso.com"],
    ["barra invertida", "/\\site-falso.com"],
    ["barras invertidas", "\\\\site-falso.com"],
    // Os três abaixo passavam na versão antiga: o parser do browser remove
    // TAB/CR/LF e o que sobra é "//site-falso.com".
    ["TAB no meio", "/\t/site-falso.com"],
    ["LF no meio", "/\n/site-falso.com"],
    ["CRLF no meio", "/\r\n/site-falso.com"],
    ["javascript:", "javascript:alert(1)"],
    ["relativo sem barra", "checkout"],
    ["vazio", ""],
  ])("bloqueia %s", (_name, next) => {
    expect(safeRedirectPath(next)).toBe("/");
  });

  it("usa o fallback informado", () => {
    expect(safeRedirectPath("//site-falso.com", "/conta")).toBe("/conta");
    expect(safeRedirectPath(null, "/conta")).toBe("/conta");
    expect(safeRedirectPath(undefined)).toBe("/");
  });

  it("devolve a forma normalizada, não a string crua", () => {
    expect(safeRedirectPath("/a/../conta")).toBe("/conta");
  });
});
