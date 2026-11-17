/**
 * Prazo do pedido = produção + entrega.
 *
 * Todas as peças são feitas à mão com prazo de produção de até 10 dias
 * corridos, contados da confirmação do pagamento (mesmo número dos termos e da
 * política de envio, e o mesmo que o contador do admin usa).
 *
 * As duas partes ficam SEPARADAS no texto de propósito: a produção é em dias
 * corridos e o frete em dias úteis. Somar os dois num número só misturaria
 * unidades e prometeria uma data que ninguém controla.
 */
export const PRODUCTION_DAYS = 10;

const calendarDays = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);
const businessDays = (n: number) => (n === 1 ? "1 dia útil" : `${n} dias úteis`);

/** "Até 10 dias de produção + até 3 dias úteis de entrega". */
export function totalDeadlineLabel(deliveryDays: number): string {
  return `Até ${calendarDays(PRODUCTION_DAYS)} de produção + até ${businessDays(deliveryDays)} de entrega`;
}

/** Aviso para peças que podem estar em estoque. */
export const READY_STOCK_NOTE = "Se a peça estiver em estoque, o envio pode sair antes.";
