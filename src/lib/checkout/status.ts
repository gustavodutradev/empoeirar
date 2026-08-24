/**
 * Rótulos e ordem do ciclo de vida do pedido. Fonte única para a linha do tempo
 * (o rastreio que o cliente acompanha) e para o admin depois.
 */
export const ORDER_STATUS = {
  pending_payment: { label: "Pedido recebido", description: "Aguardando pagamento." },
  paid: { label: "Pagamento confirmado", description: "Pagamento aprovado." },
  preparing: { label: "Em preparação", description: "Seu pedido está sendo preparado." },
  shipped: { label: "Enviado", description: "A caminho da entrega." },
  delivered: { label: "Entregue", description: "Pedido entregue." },
  cancelled: { label: "Cancelado", description: "Pedido cancelado." },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

/** Fluxo "feliz" na ordem esperada (cancelado fica fora da régua). */
export const ORDER_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
];

export function statusLabel(status: string): string {
  return (ORDER_STATUS as Record<string, { label: string }>)[status]?.label ?? status;
}
