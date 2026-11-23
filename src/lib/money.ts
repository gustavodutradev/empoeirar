/** Conversão entre valor digitado em reais e centavos (formulários do admin). */

/** 14900 -> "149,00" */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * "149", "149,9", "149.90", "1.490,00" -> centavos. null se não for um valor.
 * NaN nunca vira 0 em silêncio (antes, um valor digitado errado salvava R$ 0).
 */
export function inputToCents(input: string): number | null {
  const clean = input.trim().replace(/\s|R\$/g, "");
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(clean)) return null;
  // Com vírgula, ponto é milhar ("1.490,00"). Sem vírgula, ponto seguido de 3
  // dígitos também é milhar ("1.490" = R$ 1.490, não R$ 1,49).
  const thousandsOnly = /^\d{1,3}(\.\d{3})+$/.test(clean);
  const normalized =
    clean.includes(",") || thousandsOnly ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
