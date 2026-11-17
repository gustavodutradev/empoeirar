/**
 * Contador de prazo do pedido no painel: quantos dias CORRIDOS se passaram
 * desde o pagamento, até o envio (ou até hoje, se ainda não saiu).
 *
 * Funções puras: recebem "agora" como parâmetro para serem testáveis.
 *
 * Por que a partir do PAGAMENTO e não da criação: pedido não pago não está no
 * prazo de produção. Contar da criação mostraria ao Jane dias que não existem.
 *
 * Por que dia de calendário em Brasília e não "24 horas": pago às 23h do dia
 * 10 já é "1 dia" na manhã do dia 11, como o Jane conta. E o servidor da
 * Vercel roda em UTC, então o fuso precisa ser explícito.
 */

import { PRODUCTION_DAYS } from "@/lib/shipping/deadline";

/** Prazo de produção dos termos ("até 10 dias"). */
export const PRODUCTION_DEADLINE_DAYS = PRODUCTION_DAYS;

/** A partir de quantos dias o contador fica amarelo. */
export const WARNING_FROM_DAYS = PRODUCTION_DEADLINE_DAYS - 3;

export type OrderAgeTone = "ok" | "warning" | "late" | "done";

export type OrderAge = {
  days: number;
  tone: OrderAgeTone;
};

const spDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia de calendário em Brasília como número de dias desde a época. */
function spDayNumber(date: Date): number {
  const [y, m, d] = spDate.format(date).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return spDayNumber(to) - spDayNumber(from);
}

/**
 * null quando o contador não se aplica: pedido ainda não pago ou cancelado.
 * Depois do envio o número congela (tone "done").
 */
export function orderAge(
  order: { status: string; paid_at: string | null; shipped_at: string | null },
  now: Date,
): OrderAge | null {
  if (!order.paid_at || order.status === "cancelled") return null;

  const end = order.shipped_at ? new Date(order.shipped_at) : now;
  const days = Math.max(0, calendarDaysBetween(new Date(order.paid_at), end));

  if (order.shipped_at) return { days, tone: "done" };
  if (days > PRODUCTION_DEADLINE_DAYS) return { days, tone: "late" };
  if (days >= WARNING_FROM_DAYS) return { days, tone: "warning" };
  return { days, tone: "ok" };
}
