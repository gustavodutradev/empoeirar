import { describe, expect, it } from "vitest";
import { centsToInput, inputToCents } from "./money";

describe("inputToCents", () => {
  it.each([
    ["149", 14_900],
    ["149,9", 14_990],
    ["149,90", 14_990],
    ["149.90", 14_990],
    ["49,5", 4_950],
    ["1.490,00", 149_000],
    ["1.490", 149_000],
    [" R$ 60,00 ", 6_000],
    ["0", 0],
  ])("%j -> %d", (input, cents) => {
    expect(inputToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "1,2,3", "-10", "10,999", "1.49.0"])("recusa %j", (input) => {
    expect(inputToCents(input)).toBeNull();
  });
});

describe("centsToInput", () => {
  it("formata com vírgula", () => {
    expect(centsToInput(14_900)).toBe("149,00");
    expect(centsToInput(4_950)).toBe("49,50");
  });
});
