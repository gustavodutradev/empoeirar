/**
 * Validacao de CPF (digito verificador real, nao so formato).
 *
 * Por que validar de verdade: um CPF com formato certo mas digito errado passa
 * despercebido e quebra la na frente (pagamento/nota). Melhor barrar na borda.
 * NAO valida se o CPF "existe" na Receita — so a consistencia matematica.
 */

/** Remove tudo que nao for digito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** true se o CPF (com ou sem mascara) tem digitos verificadores validos. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  // Rejeita sequencias iguais (00000000000, 11111111111, ...), que passam na
  // conta mas nunca sao CPFs reais.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitAt = (i: number) => cpf.charCodeAt(i) - 48;

  const checkDigit = (length: number): number => {
    let sum = 0;
    let factor = length + 1;
    for (let i = 0; i < length; i++) {
      sum += digitAt(i) * factor;
      factor--;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digitAt(9) && checkDigit(10) === digitAt(10);
}
