import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { sendOrderStatusEmail } from "@/lib/email/order-notification";
import { getPayment, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { decidePaymentTransition } from "@/lib/payments/payment-transition";
import { verifyWebhookSignature } from "@/lib/payments/webhook-verify";
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
 *  3. Decide a transicao com decidePaymentTransition (regras de negocio,
 *     funcao pura e testada) olhando o pedido E o pagamento.
 *  4. Escreve via service_role chamando advance_order_status (idempotente).
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
    // Pagamento inexistente (404) — ex.: id "123456" do simulador. Dá ack
    // (200) e não avança nada; não é erro transitório, então não pede reenvio.
    if (!payment) {
      return NextResponse.json({ ignored: "payment_not_found" }, { status: 200 });
    }

    // external_reference e o id do pedido que NOS mandamos na preference. Se nao
    // for UUID, nao e nosso: ack sem ir ao banco (senao vira erro de cast).
    if (!z.uuid().safeParse(payment.externalReference).success) {
      return NextResponse.json({ ignored: "no_reference" }, { status: 200 });
    }

    const { data: order, error: orderError } = await admin
      .from("customer_order")
      .select("id, status, total_cents, mp_payment_id")
      .eq("id", payment.externalReference)
      .maybeSingle();
    if (orderError) {
      // Erro de banco e transitorio: 500 faz o MP reenviar. Dar 200 aqui
      // perderia a notificacao e o pedido pago ficaria preso em "aguardando".
      console.error("[mp webhook] leitura do pedido:", orderError.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ ignored: "order_not_found" }, { status: 200 });
    }

    const decision = decidePaymentTransition(
      { status: order.status, mpPaymentId: order.mp_payment_id, totalCents: order.total_cents },
      { id: payment.id, status: payment.status, amountCents: payment.amountCents },
    );

    if (decision.action === "ignore") {
      if (decision.alert) {
        // Casos que pedem acao humana (estorno, disputa...). Item 42: virar alerta.
        // So ids e valores: nada de nome/e-mail do cliente no log.
        console.error(
          `[mp webhook] ATENCAO ${decision.reason}: pedido=${order.id} status=${order.status} ` +
            `pagamento=${payment.id} mp_status=${payment.status} ` +
            `total=${order.total_cents} pago=${payment.amountCents}`,
        );
      }
      return NextResponse.json({ ignored: decision.reason }, { status: 200 });
    }

    const { data: changed, error } = await admin.rpc("advance_order_status", {
      p_order_id: order.id,
      p_status: decision.to,
      p_note: decision.note,
      // So grava o id quando CONFIRMA o pagamento. Antes gravava em toda
      // notificacao, e um pagamento recusado sobrescrevia o que pagou.
      p_mp_payment_id: decision.paymentId,
    });

    if (error) {
      // Erro do banco: pede reenvio (500).
      console.error("[mp webhook] advance_order_status:", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }

    // Só notifica se HOUVE transição de verdade. O MP reenvia webhooks; sem
    // isto, um reenvio do mesmo pagamento mandaria e-mail duplicado ao cliente.
    if (changed === true) {
      await sendOrderStatusEmail(order.id, decision.to);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[mp webhook] erro:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
