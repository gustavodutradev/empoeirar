import { isOrderStatus, ORDER_STATUS, type OrderStatus } from "@/lib/checkout/status";

/**
 * Filtro do painel de pedidos, lido de ?status= na URL.
 *
 * O valor vem do usuário (URL), então é validado contra uma lista fechada:
 * qualquer coisa fora dela cai no padrão. Nunca vai cru para a query.
 *
 * "abertos" é o padrão: pedidos pagos que ainda não saíram, que é o que o
 * Jane precisa olhar no dia a dia. O filtro "Pagamento confirmado" sozinho é
 * a lista de pedidos esperando começar a produção.
 */
export const OPEN_STATUSES: readonly OrderStatus[] = ["paid", "preparing", "ready_to_ship"];

export type OrderFilter = {
  key: string;
  label: string;
  /** null = sem filtro de status (todos). */
  statuses: readonly OrderStatus[] | null;
};

export const DEFAULT_ORDER_FILTER: OrderFilter = {
  key: "abertos",
  label: "Em aberto",
  statuses: OPEN_STATUSES,
};

const ALL_FILTER: OrderFilter = { key: "todos", label: "Todos", statuses: null };

/** Opções na ordem em que aparecem na tela. */
export const ORDER_FILTERS: readonly OrderFilter[] = [
  DEFAULT_ORDER_FILTER,
  ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((status) => ({
    key: status,
    label: ORDER_STATUS[status].label,
    statuses: [status],
  })),
  ALL_FILTER,
];

export function parseOrderFilter(value: string | string[] | undefined): OrderFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return DEFAULT_ORDER_FILTER;
  if (raw === ALL_FILTER.key) return ALL_FILTER;
  if (isOrderStatus(raw)) return ORDER_FILTERS.find((f) => f.key === raw) ?? DEFAULT_ORDER_FILTER;
  return DEFAULT_ORDER_FILTER;
}
