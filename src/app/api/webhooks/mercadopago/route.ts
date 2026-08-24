import { NextResponse } from "next/server";
import { env } from "@/env";
import { ORDER_STATUS } from "@/lib/checkout/status";
import { getPayment, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { mapPaymentStatus, verifyWebhookSignature } from "@/lib/payments/webhook-verify";
import { createAdminClient } from "@/lib/supabase/admin";

// node:crypto (assinatura) exige runtime Node, nao Edge.
export const runtime = "nodejs";

/**
 * Webhook do Mercado Pago (server-to-server). Confirma pagamentos e avanca o
 * status do pedido. Camadas:
 *  1. Assinatura (x-signature) validada com o segredo do webhook — barra
 *     notificacao forjada.
 *  2. NUNCA confia no corpo: re-busca o pagamento na API do MP pelo id.
 *  3. Escreve via service_role chamando advance_order_status (idempotente).
 *
 * Sempre responde rapido. 200 = processado/ignorado (MP para de reenviar);
 * 401 = assinatura invalida; 500 = erro transitorio (MP reenvia depois).
 */
export async function POST(request: Request) {
  // Sem access token configurado, nao ha como buscar o pagamento: ignora.
  if (!isMercadoPagoConfigured()) {
    return NextResponse.json({ ignored: "unconfigured" }, { status: 200 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    data?: { id?: string | number };
  } | null;

  const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body?.data?.id ?? url.searchParams.get("data.id") ?? "");

  // Só tratamos notificação de pagamento.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ ignored: "not_payment" }, { status: 200 });
  }

  // Valida a assinatura quando o segredo está configurado (obrigatório em prod).
  if (env.MERCADOPAGO_WEBHOOK_SECRET) {
    const valid = verifyWebhookSignature(env.MERCADOPAGO_WEBHOOK_SECRET, {
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });
    if (!valid) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[mp webhook] MERCADOPAGO_WEBHOOK_SECRET ausente — assinatura não verificada.");
  }

  try {
    // Fonte da verdade: busca o pagamento direto no MP.
    const payment = await getPayment(dataId);
    const nextStatus = mapPaymentStatus(payment.status);

    if (!nextStatus || !payment.externalReference) {
      return NextResponse.json({ ignored: "no_transition" }, { status: 200 });
    }

    const admin = createAdminClient();
    const { error } = await admin.rpc("advance_order_status", {
      p_order_id: payment.externalReference,
      p_status: nextStatus,
      p_note: ORDER_STATUS[nextStatus].description,
      p_mp_payment_id: payment.id,
    });

    if (error) {
      // Erro do banco: pede reenvio (500).
      console.error("[mp webhook] advance_order_status:", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mp webhook] erro:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
