import { describe, expect, it } from "vitest";
import { normalizeTrackingCode, trackingUrl } from "./tracking";

describe("normalizeTrackingCode", () => {
  it("normaliza o formato dos Correios", () => {
    expect(normalizeTrackingCode(" aa 123.456.789-br ")).toBe("AA123456789BR");
  });

  it("aceita códigos só numéricos (outras transportadoras)", () => {
    expect(normalizeTrackingCode("10012345678901")).toBe("10012345678901");
  });

  it.each(["", "abc", "a".repeat(41), "<>!@#", "../../x"])("recusa %j", (input) => {
    expect(normalizeTrackingCode(input)).toBeNull();
  });
});

describe("trackingUrl", () => {
  it("monta o link do Melhor Rastreio", () => {
    expect(trackingUrl("AA123456789BR")).toBe(
      "https://www.melhorrastreio.com.br/rastreio/AA123456789BR",
    );
  });
});
