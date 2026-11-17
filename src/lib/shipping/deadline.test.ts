import { describe, expect, it } from "vitest";
import { PRODUCTION_DAYS, totalDeadlineLabel } from "./deadline";

describe("totalDeadlineLabel", () => {
  it("mostra produção e entrega separadas", () => {
    expect(totalDeadlineLabel(3)).toBe("Até 10 dias de produção + até 3 dias úteis de entrega");
  });

  it("singular para 1 dia", () => {
    expect(totalDeadlineLabel(1)).toBe("Até 10 dias de produção + até 1 dia útil de entrega");
  });

  it("prazo de produção é 10 dias", () => {
    expect(PRODUCTION_DAYS).toBe(10);
  });
});
