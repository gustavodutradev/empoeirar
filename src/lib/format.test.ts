import { describe, expect, it } from "vitest";
import { formatBRL, formatDateTime, mmToCm, sizeLabel } from "./format";

// Intl usa espaço não separável (U+00A0) entre "R$" e o valor.
const NBSP = " ";

describe("formatBRL", () => {
  it.each([
    [14900, `R$${NBSP}149,00`],
    [0, `R$${NBSP}0,00`],
    [5, `R$${NBSP}0,05`],
    [123456789, `R$${NBSP}1.234.567,89`],
  ])("%i centavos -> %s", (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });
});

describe("formatDateTime", () => {
  // Os testes rodam em UTC (vitest.config.ts), como a Vercel.
  it("mostra horário de Brasília mesmo com o servidor em UTC", () => {
    expect(formatDateTime("2026-08-20T22:30:00Z")).toBe("20/08/2026, 19:30");
  });

  it("vira o dia corretamente perto da meia-noite UTC", () => {
    expect(formatDateTime("2026-08-21T02:00:00Z")).toBe("20/08/2026, 23:00");
  });
});

describe("mmToCm", () => {
  it.each([
    [265, "26,5"],
    [100, "10"],
    [3, "0,3"],
  ])("%i mm -> %s cm", (mm, expected) => {
    expect(mmToCm(mm)).toBe(expected);
  });
});

describe("sizeLabel", () => {
  it.each([
    ["P", "Pequeno"],
    ["m", "Médio"],
    [" G ", "Grande"],
    ["Conjunto", "Conjunto"],
  ])("%j -> %s", (label, expected) => {
    expect(sizeLabel(label)).toBe(expected);
  });
});
