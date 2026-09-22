/**
 * Rótulos e ordem do ciclo de vida do pedido. Fonte única para a linha do tempo
 * (o rastreio que o cliente acompanha) e para o admin.
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

export function isOrderStatus(value: string): value is OrderStatus {
  return Object.hasOwn(ORDER_STATUS, value);
}

/**
 * Título e subtítulo do topo da página do pedido, por status. Tipado como
 * Record<OrderStatus, ...>: se um status novo entrar em ORDER_STATUS, o
 * TypeScript exige o texto dele aqui (sem cair em "Pedido criado!" por engano).
 * O e-mail entre chaves é preenchido pela página.
 */
export const ORDER_PAGE_HEADLINE: Record<OrderStatus, { title: string; lead: string }> = {
  pending_payment: {
    title: "Pedido recebido!",
    lead: "Falta só o pagamento. Enviamos os detalhes do pedido para {email}.",
  },
  paid: {
    title: "Pagamento confirmado!",
    lead: "Agora é com a gente: vamos começar a preparar suas peças.",
  },
  preparing: {
    title: "Seu pedido está em preparação",
    lead: "Cada peça é feita à mão. Avisamos em {email} assim que o pedido sair para entrega.",
  },
  shipped: {
    title: "Seu pedido está a caminho",
    lead: "Já saiu daqui. Acompanhe as etapas logo abaixo.",
  },
  delivered: {
    title: "Pedido entregue",
    lead: "Esperamos que você aproveite as peças. Bom trabalho no ateliê!",
  },
  cancelled: {
    title: "Pedido cancelado",
    lead: "Este pedido foi cancelado. Se tiver qualquer dúvida, fale com a gente.",
  },
};
