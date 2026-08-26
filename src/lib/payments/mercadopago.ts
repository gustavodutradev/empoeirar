import "server-only";
import { env } from "@/env";

/**
 * Cliente do Mercado Pago (REST, via fetch — sem SDK, sem dependencia extra).
 *
 * So codigo de SERVIDOR ("server-only"): o access token e segredo e nunca pode
 * ir ao browser. Enquanto MERCADOPAGO_ACCESS_TOKEN nao estiver setado, o app
 * roda normal e isConfigured() devolve false — quem chama decide o fallback.
 */

const MP_API = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(env.MERCADOPAGO_ACCESS_TOKEN);
}

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
    "content-type": "application/json",
  };
}

export type PreferenceItem = {
  title: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreatePreferenceInput = {
  orderId: string;
  items: PreferenceItem[];
  backUrl: string; // pra onde o cliente volta depois de pagar
  shippingCents?: number; // frete cobrado junto
  payerEmail?: string;
};

/**
 * Cria uma "preference" (a intencao de pagamento) e devolve o link do checkout.
 * external_reference = id do pedido, para o webhook reconciliar depois.
 */
export async function createPreference(
  input: CreatePreferenceInput,
): Promise<{ id: string; initPoint: string }> {
  // Itens do pedido. O MP espera valor decimal em reais (centavos / 100).
  const items = input.items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    currency_id: "BRL",
    unit_price: item.unitPriceCents / 100,
  }));

  // FRETE como LINHA DE ITEM (nao como shipments.cost). Motivo: o shipments.cost
  // do Checkout Pro so soma ao total de forma confiavel junto do Mercado Envios;
  // com frete proprio (mode "not_specified") o MP as vezes NAO cobra o frete, e
  // o valor pago fica menor que o total do pedido — o cross-check do webhook
  // (corretamente) recusa e o pedido nao avanca. Como item, o frete entra
  // SEMPRE no total cobrado, deterministicamente.
  if (input.shippingCents && input.shippingCents > 0) {
    items.push({
      title: "Frete",
      quantity: 1,
      currency_id: "BRL",
      unit_price: input.shippingCents / 100,
    });
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      external_reference: input.orderId,
      items,
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      back_urls: {
        success: input.backUrl,
        pending: input.backUrl,
        failure: input.backUrl,
      },
      auto_return: "approved",
      // notification_url NAO vai aqui de proposito: a URL do webhook e a do
      // painel do MP (fonte unica). URL na preferencia sobrescreveria a do
      // painel silenciosamente.
    }),
  });

  if (!res.ok) {
    throw new Error(`MP preference falhou: ${res.status}`);
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, initPoint: data.init_point };
}

/**
 * Le um pagamento pelo id (o webhook so manda o id; a fonte da verdade e a API).
 * Nunca confiamos no status que "chega" — buscamos direto no MP.
 */
export type MpPayment = {
  id: string;
  status: string;
  externalReference: string | null;
  amountCents: number;
};

/**
 * Le um pagamento pelo id. Retorna null se o pagamento NAO existe (404) — o
 * webhook trata isso como "nada a fazer" e da ack, sem reenvio eterno. Erros
 * transitorios (5xx/rede) sao lancados para o webhook responder 500 e o MP
 * reenviar. Nunca confiamos no corpo da notificacao: a verdade vem daqui.
 */
export async function getPayment(paymentId: string): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null; // pagamento inexistente (ex.: id do simulador)
  if (!res.ok) {
    throw new Error(`MP getPayment falhou: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: number;
    status: string;
    external_reference: string | null;
    transaction_amount: number | null;
  };
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference,
    // Valor em centavos, para cross-check com o total do pedido.
    amountCents: Math.round((data.transaction_amount ?? 0) * 100),
  };
}
