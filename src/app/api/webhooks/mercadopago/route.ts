import { NextResponse } from "next/server";
import { env } from "@/env";
import { ORDER_STATUS } from "@/lib/checkout/status";
import { getPayment, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { mapPaymentStatus, verifyWebhookSignature } from "@/lib/payments/webhook-verify";
import { allowRequest, clientIp } from "@/lib/rate-limit";
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

  const admin = createAdminClient();

  // Rate limit por IP: barra flood de notificações forjadas antes de gastar
  // chamadas na API do MP. Limite generoso — o MP legítimo manda pouquíssimas.
  const ip = clientIp(request.headers);
  if (!(await allowRequest(admin, `mp-webhook:${ip}`, 300, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as {
    type?: string;
    data?: { id?: string | number };
  } | null;

  const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  // O MP assina o data.id do QUERY STRING — é ele que entra no manifesto da
  // assinatura (o corpo é só fallback). Usar o do corpo pode dar 401 em
  // notificação legítima.
  const dataId = url.searchParams.get("data.id") ?? String(body?.data?.id ?? "");

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

    // LITMUS do service_role (temporário): quantos pedidos o cliente admin
    // enxerga. Se 0/null, o admin NAO esta bypassando a RLS (chave service_role
    // errada no ambiente OU deploy velho sem a env nova) — e a causa de
    // order_not_found. Se > 0, o admin le o banco e o problema e outro.
    const { count: adminOrders, error: adminErr } = await admin
      .from("customer_order")
      .select("id", { count: "exact", head: true });

    // DIAGNÓSTICO (temporário): mostra o que o MP devolveu para este id.
    // found:false => token não consegue ler este pagamento (token de outra
    // conta) OU pagamento inexistente.
    console.warn(
      "[mp webhook] diag",
      JSON.stringify({
        dataId,
        found: Boolean(payment),
        status: payment?.status ?? null,
        extRef: payment?.externalReference ?? null,
        amountCents: payment?.amountCents ?? null,
        adminOrders: adminOrders ?? null,
        adminErr: adminErr
          ? {
              code: adminErr.code ?? null,
              message: adminErr.message ?? null,
              details: adminErr.details ?? null,
              hint: adminErr.hint ?? null,
            }
          : null,
      }),
    );
    // Pagamento inexistente (404) — ex.: id "123456" do simulador. Dá ack
    // (200) e não avança nada; não é erro transitório, então não pede reenvio.
    if (!payment) {
      return NextResponse.json({ ignored: "payment_not_found" }, { status: 200 });
    }

    const nextStatus = mapPaymentStatus(payment.status);
    if (!nextStatus || !payment.externalReference) {
      console.warn("[mp webhook] no_transition", payment.status, payment.externalReference);
      return NextResponse.json({ ignored: "no_transition" }, { status: 200 });
    }

    // Cross-check ao CONFIRMAR pagamento: o valor pago tem que bater com o
    // total do pedido. Impede que um pagamento de valor menor "confirme" um
    // pedido caro (IDOR aplicado a pagamento).
    if (nextStatus === "paid") {
      const { data: order } = await admin
        .from("customer_order")
        .select("total_cents")
        .eq("id", payment.externalReference)
        .maybeSingle();
      if (!order) {
        return NextResponse.json({ ignored: "order_not_found" }, { status: 200 });
      }
      if (order.total_cents !== payment.amountCents) {
        console.error(
          `[mp webhook] valor divergente: pedido=${payment.externalReference} total=${order.total_cents} pago=${payment.amountCents}`,
        );
        return NextResponse.json({ ignored: "amount_mismatch" }, { status: 200 });
      }
    }

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
