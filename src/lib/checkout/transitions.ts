import { ORDER_FLOW, type OrderStatus } from "./status";

/**
 * Transições que o ADMIN pode fazer à mão. Função pura, testável sem banco.
 *
 * Por que existe: antes o painel listava todos os status e o servidor aceitava
 * qualquer um, então era possível ir de "Cancelado" para "Enviado" ou de
 * "Entregue" para "Aguardando pagamento" com um clique errado.
 *
 * Regras:
 * - Para frente, um passo por vez. "Pago" pode pular direto para "Pronto para
 *   envio" (peça de pronta entrega, sem produção).
 * - Para trás, só um passo, para desfazer um clique errado.
 * - Cancelar é permitido enquanto o pedido não saiu. Cancelar NÃO estorna o
 *   pagamento: o estorno é feito no painel do Mercado Pago (a UI avisa).
 * - O que o admin NUNCA faz à mão: confirmar pagamento ("aguardando pagamento"
 *   -> "pago") e reabrir pedido cancelado. Os dois envolvem dinheiro e passam
 *   pelo webhook do Mercado Pago ou por decisão fora do sistema.
 *
 * O webhook e o cron NÃO passam por aqui: eles têm as próprias regras
 * (payment-transition.ts e expiration.ts).
 */
export const ADMIN_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: [],
  paid: ["preparing", "ready_to_ship", "cancelled"],
  preparing: ["paid", "ready_to_ship", "cancelled"],
  ready_to_ship: ["preparing", "shipped", "cancelled"],
  shipped: ["ready_to_ship", "delivered"],
  delivered: ["shipped"],
  cancelled: [],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from].includes(to);
}

/**
 * true quando `to` vem ANTES de `from` no fluxo (o admin desfazendo uma etapa).
 * Usado para não reenviar ao cliente um e-mail de etapa que ele já recebeu.
 * Cancelamento não é "voltar": fica fora da régua.
 */
export function isBackwardMove(from: OrderStatus, to: OrderStatus): boolean {
  const fromIndex = ORDER_FLOW.indexOf(from);
  const toIndex = ORDER_FLOW.indexOf(to);
  return fromIndex !== -1 && toIndex !== -1 && toIndex < fromIndex;
}
