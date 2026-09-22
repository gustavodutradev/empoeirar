import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "./status";

export type TimelineEvent = {
  status: string;
  note: string | null;
  created_at: string;
};

export type TimelineStep = {
  status: OrderStatus;
  label: string;
  description: string;
  /** Data do evento que marcou a etapa; null se ainda não aconteceu. */
  at: string | null;
  reached: boolean;
  /** "cancelled" pinta a etapa terminal de cancelamento com a cor de erro. */
  tone: "default" | "cancelled";
};

/**
 * Monta a linha do tempo que o cliente vê a partir do status atual e do log
 * de eventos (order_status_event, append-only).
 *
 * Função pura (sem banco, sem React) de propósito: é a regra de negócio da
 * régua e fica testável isoladamente (item 43).
 *
 * Regras:
 * - Pedido ativo: régua completa do ORDER_FLOW, com as etapas futuras apagadas.
 * - Pedido cancelado: só as etapas que aconteceram ANTES do cancelamento,
 *   seguidas da etapa "Cancelado". Etapas futuras somem, porque não vão
 *   acontecer e mostrá-las apagadas sugeriria que o pedido ainda anda.
 * - Cada etapa usa o evento MAIS RECENTE daquele status. O banco não impede
 *   idas e voltas (ex.: pending_payment → cancelled → paid, se o MP aprovar um
 *   pagamento depois de uma recusa), então "o primeiro evento" pode ser velho.
 */
export function buildOrderTimeline(
  currentStatus: string,
  events: readonly TimelineEvent[],
): TimelineStep[] {
  // Ordena por data para não depender da ordem que a query devolveu.
  const sorted = [...events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  if (currentStatus !== "cancelled") {
    return ORDER_FLOW.map((status) => {
      const event = lastEventOf(sorted, status);
      return toStep(status, event, event !== undefined, "default");
    });
  }

  const cancelEvent = lastEventOf(sorted, "cancelled");
  // Sem evento de cancelamento (dado inconsistente): considera todo o histórico.
  const before = cancelEvent ? sorted.slice(0, sorted.lastIndexOf(cancelEvent)) : sorted;

  const reachedSteps = ORDER_FLOW.flatMap((status) => {
    const event = lastEventOf(before, status);
    return event ? [toStep(status, event, true, "default")] : [];
  });

  return [...reachedSteps, toStep("cancelled", cancelEvent, true, "cancelled")];
}

function lastEventOf(
  events: readonly TimelineEvent[],
  status: OrderStatus,
): TimelineEvent | undefined {
  return events.findLast((e) => e.status === status);
}

function toStep(
  status: OrderStatus,
  event: TimelineEvent | undefined,
  reached: boolean,
  tone: TimelineStep["tone"],
): TimelineStep {
  return {
    status,
    label: ORDER_STATUS[status].label,
    description: event?.note ?? ORDER_STATUS[status].description,
    at: event?.created_at ?? null,
    reached,
    tone,
  };
}
