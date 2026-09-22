import { describe, expect, it } from "vitest";
import { isValidCpf, onlyDigits } from "./cpf";

describe("isValidCpf", () => {
  // CPFs matematicamente válidos, de uso público em exemplos (não são de ninguém).
  it.each(["529.982.247-25", "52998224725", "111.444.777-35", "123.456.789-09"])(
    "aceita %s",
    (cpf) => {
      expect(isValidCpf(cpf)).toBe(true);
    },
  );

  it.each([
    ["1º dígito verificador errado", "529.982.247-35"],
    ["2º dígito verificador errado", "529.982.247-24"],
    ["sequência repetida (passa na conta, mas não existe)", "111.111.111-11"],
    ["zeros", "00000000000"],
    ["curto", "5299822472"],
    ["longo", "529982247250"],
    ["vazio", ""],
    ["letras", "abc.def.ghi-jk"],
  ])("rejeita: %s", (_name, cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe("onlyDigits", () => {
  it("remove máscara, espaços e letras", () => {
    expect(onlyDigits(" 529.982.247-25 ")).toBe("52998224725");
    expect(onlyDigits("(31) 9 8888-7777")).toBe("31988887777");
    expect(onlyDigits("abc")).toBe("");
  });
});
