import { describe, expect, it } from "vitest";
import { createAlertThrottle } from "./throttle";

const MIN = 60_000;
const make = () =>
  createAlertThrottle({ sameAlertWindowMs: 60 * MIN, windowMs: 10 * MIN, maxPerWindow: 3 });

describe("createAlertThrottle", () => {
  it("o mesmo alerta passa 1x por hora", () => {
    const allow = make();
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 30 * MIN)).toBe(false);
    expect(allow("a", 60 * MIN)).toBe(true);
  });

  it("limita o total por janela, mesmo com alertas diferentes (erro em massa)", () => {
    const allow = make();
    expect(["a", "b", "c", "d"].map((fp) => allow(fp, 0))).toEqual([true, true, true, false]);
    // Passada a janela de 10 min, volta a aceitar.
    expect(allow("d", 10 * MIN)).toBe(true);
  });

  it("alerta bloqueado pelo total não conta como enviado", () => {
    const allow = make();
    for (const fp of ["a", "b", "c"]) allow(fp, 0);
    expect(allow("d", 1)).toBe(false);
    expect(allow("d", 10 * MIN)).toBe(true);
  });
});
