/**
 * Normaliza texto para comparação: sem acento, minúsculas, espaços colapsados.
 * "  Sagrada   Família " -> "sagrada familia".
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
