/** Formata centavos (int) como moeda BRL: 14900 -> "R$ 149,00". */
export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Formata milimetros como centimetros no padrao pt-BR: 265 -> "26,5". */
export function mmToCm(mm: number): string {
  return (mm / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
