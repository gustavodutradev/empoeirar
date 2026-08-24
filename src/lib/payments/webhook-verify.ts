import { createHmac, timingSafeEqual } from "node:crypto";

import type { OrderStatus } from "@/lib/checkout/status";

/**
 * Funcoes PURAS do webhook (sem env, testaveis isoladamente).
 */

/**
 * Valida a assinatura do webhook do Mercado Pago.
 *
 * O MP manda o header `x-signature: ts=<epoch>,v1=<hmac>` e o `x-request-id`.
 * A gente remonta o "manifesto" no formato exato que o MP assinou e confere o
 * HMAC-SHA256 com o nosso segredo. Se bater, a notificacao e autentica — sem
 * isso, qualquer um poderia POSTar no nosso webhook fingindo ser o MP e marcar
 * pedidos como pagos.
 *
 * Comparacao com timingSafeEqual (tempo constante) para nao vazar o segredo por
 * ataque de timing.
 */
export function verifyWebhookSignature(
  secret: string,
  parts: { xSignature: string | null; xRequestId: string | null; dataId: string },
): boolean {
  if (!secret || !parts.xSignature || !parts.dataId) return false;

  // x-signature = "ts=123,v1=abc"
  let ts = "";
  let v1 = "";
  for (const segment of parts.xSignature.split(",")) {
    const [key, value] = segment.split("=").map((s) => s.trim());
    if (key === "ts") ts = value ?? "";
    if (key === "v1") v1 = value ?? "";
  }
  if (!ts || !v1) return false;

  // Manifesto no formato do MP. request-id entra so se veio no header.
  // data.id normalizado para minusculo (recomendacao do MP).
  const requestPart = parts.xRequestId ? `request-id:${parts.xRequestId};` : "";
  const manifest = `id:${parts.dataId.toLowerCase()};${requestPart}ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Traduz o status do pagamento no MP para o status do nosso pedido.
 * Retorna null quando o status nao deve mudar o pedido (ex.: in_mediation).
 */
export function mapPaymentStatus(mpStatus: string): OrderStatus | null {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    case "pending":
    case "in_process":
    case "authorized":
      return "pending_payment";
    default:
      return null;
  }
}
