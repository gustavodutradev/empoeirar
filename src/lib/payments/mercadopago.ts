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
  notificationUrl: string; // nosso webhook
  payerEmail?: string;
};

/**
 * Cria uma "preference" (a intencao de pagamento) e devolve o link do checkout.
 * external_reference = id do pedido, para o webhook reconciliar depois.
 */
export async function createPreference(
  input: CreatePreferenceInput,
): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      external_reference: input.orderId,
      items: input.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        currency_id: "BRL",
        // MP espera valor decimal em reais (centavos / 100).
        unit_price: item.unitPriceCents / 100,
      })),
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
      back_urls: {
        success: input.backUrl,
        pending: input.backUrl,
        failure: input.backUrl,
      },
      auto_return: "approved",
      notification_url: input.notificationUrl,
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
export async function getPayment(
  paymentId: string,
): Promise<{ id: string; status: string; externalReference: string | null }> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`MP getPayment falhou: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: number;
    status: string;
    external_reference: string | null;
  };
  return {
    id: String(data.id),
    status: data.status,
    externalReference: data.external_reference,
  };
}
