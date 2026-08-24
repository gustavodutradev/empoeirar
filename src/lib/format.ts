/** Formata centavos (int) como moeda BRL: 14900 -> "R$ 149,00". */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Data/hora no padrao pt-BR: "20/08/2026 19:30". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Formata milimetros como centimetros no padrao pt-BR: 265 -> "26,5". */
export function mmToCm(mm: number): string {
  return (mm / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Rotulo de tamanho por extenso na vitrine: P/M/G -> Pequeno/Medio/Grande.
 * Outros rotulos (Conjunto, Unico, "1 unidade"...) passam sem mudanca.
 * So exibicao — o rotulo real da variante continua no banco.
 */
const SIZE_LABELS: Record<string, string> = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande",
};
export function sizeLabel(label: string): string {
  return SIZE_LABELS[label.trim().toUpperCase()] ?? label;
}
