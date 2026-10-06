/**
 * Regras de prazo de pagamento e expiração de pedidos (item 26). Funções PURAS:
 * recebem datas e listas, não acessam banco nem rede.
 *
 * Linha do tempo de um pedido não pago:
 *
 *   criado ──── 3 dias ────► fim do prazo de pagamento
 *     │                       - o link do Mercado Pago para de aceitar pagamento
 *     │                       - Pix e boleto gerados vencem aqui
 *     │                       - o botão "Pagar" some da página do pedido
 *     └────────── 7 dias ───► o cron cancela o pedido
 *
 * Por que 4 dias de folga entre um e outro: um boleto pago no último minuto do
 * prazo leva até 3 dias úteis para compensar. Cancelar antes disso cancelaria
 * um pedido que vai ser pago. 3 dias é também o mínimo que o Mercado Pago
 * recomenda para vencimento de Pix e boleto.
 */

export const PAYMENT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const EXPIRE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function paymentDeadline(createdAt: string): Date {
  return new Date(Date.parse(createdAt) + PAYMENT_WINDOW_MS);
}

export function isPaymentWindowOpen(createdAt: string, now: Date): boolean {
  return now.getTime() < paymentDeadline(createdAt).getTime();
}

/** Limite de criação a partir do qual um pedido não pago é cancelado. */
export function staleCutoff(now: Date): Date {
  return new Date(now.getTime() - EXPIRE_AFTER_MS);
}

/**
 * Data no formato que o Mercado Pago pede (ISO 8601 com fuso), no horário de
 * Brasília: "2026-10-09T14:30:00.000-03:00". Brasília está fixa em UTC-3 desde
 * o fim do horário de verão (2019).
 */
export function toMercadoPagoDate(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 23)}-03:00`;
}

/** Pagamentos do MP em andamento: ainda podem virar "approved". */
const IN_PROGRESS: ReadonlySet<string> = new Set(["pending", "in_process", "authorized"]);

export type UnpaidOrderDecision =
  /** Nenhum pagamento vivo: pode cancelar. */
  | "cancel"
  /** Há pagamento em andamento (boleto ou Pix gerado, análise de risco). */
  | "payment_in_progress"
  /** Há pagamento APROVADO, mas o pedido segue aguardando: webhook perdido. */
  | "approved_not_confirmed";

/**
 * Decide se um pedido ainda "aguardando pagamento" pode ser cancelado, olhando
 * os pagamentos que o Mercado Pago tem para ele. Usada pelo cron de expiração
 * e pelo botão "Cancelar pedido" do cliente: os dois não podem cancelar um
 * pedido que já foi pago ou que está para ser pago.
 */
export function decideUnpaidOrder(payments: readonly { status: string }[]): UnpaidOrderDecision {
  if (payments.some((p) => p.status === "approved")) return "approved_not_confirmed";
  if (payments.some((p) => IN_PROGRESS.has(p.status))) return "payment_in_progress";
  return "cancel";
}
