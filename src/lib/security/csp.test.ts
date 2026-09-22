import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, generateNonce } from "./csp";

const SUPABASE = "https://abcdefgh.supabase.co";

/** Transforma a string da CSP em { diretiva: [valores] } para asserções legíveis. */
function parse(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

const prod = parse(
  buildContentSecurityPolicy({ nonce: "abc123", supabaseUrl: SUPABASE, isDev: false }),
);
const dev = parse(
  buildContentSecurityPolicy({ nonce: "abc123", supabaseUrl: SUPABASE, isDev: true }),
);

describe("buildContentSecurityPolicy", () => {
  it("script-src usa nonce + strict-dynamic e nunca unsafe-inline", () => {
    expect(prod["script-src"]).toContain("'nonce-abc123'");
    expect(prod["script-src"]).toContain("'strict-dynamic'");
    expect(prod["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("unsafe-eval só existe em dev (HMR)", () => {
    expect(prod["script-src"]).not.toContain("'unsafe-eval'");
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("upgrade-insecure-requests só em produção", () => {
    expect(prod).toHaveProperty("upgrade-insecure-requests");
    expect(dev).not.toHaveProperty("upgrade-insecure-requests");
  });

  it("bloqueia iframe, plugins, <base> e form para fora", () => {
    expect(prod["frame-ancestors"]).toEqual(["'none'"]);
    expect(prod["object-src"]).toEqual(["'none'"]);
    expect(prod["base-uri"]).toEqual(["'self'"]);
    expect(prod["form-action"]).toEqual(["'self'"]);
    expect(prod["default-src"]).toEqual(["'self'"]);
  });

  it("libera só a ORIGEM do Supabase (sem path), inclusive via WebSocket", () => {
    const csp = parse(
      buildContentSecurityPolicy({
        nonce: "n",
        supabaseUrl: `${SUPABASE}/rest/v1/`,
        isDev: false,
      }),
    );
    expect(csp["img-src"]).toContain(SUPABASE);
    expect(csp["connect-src"]).toEqual(["'self'", SUPABASE, "wss://abcdefgh.supabase.co"]);
  });

  it("Supabase local (http) vira ws://", () => {
    const csp = parse(
      buildContentSecurityPolicy({
        nonce: "n",
        supabaseUrl: "http://127.0.0.1:54321",
        isDev: true,
      }),
    );
    expect(csp["connect-src"]).toContain("ws://127.0.0.1:54321");
  });

  it("lança com URL inválida do Supabase (falha alto em vez de gerar CSP quebrada)", () => {
    expect(() =>
      buildContentSecurityPolicy({ nonce: "n", supabaseUrl: "não-é-url", isDev: false }),
    ).toThrow();
  });
});

describe("generateNonce", () => {
  it("gera 32 caracteres hex, diferentes a cada chamada", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });
});
