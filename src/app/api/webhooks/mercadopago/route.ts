import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { sendOrderStatusEmail } from "@/lib/email/order-notification";
import { notifyAdmin, reportError } from "@/lib/monitoring/report";
import { getPayment, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { decidePaymentTransition, type IgnoreReason } from "@/lib/payments/payment-transition";
import { verifyWebhookSignature } from "@/lib/payments/webhook-verify";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

// Texto do e-mail de alerta para cada motivo que pede acao humana.
const ALERT_REASON_TEXT: Partial<Record<IgnoreReason, string>> = {
  duplicate_payment: "Cliente pagou duas vezes. Estornar um dos pagamentos no Mercado Pago.",
  paid_after_cancel: "Pagamento aprovado em pedido cancelado. Reativar o pedido ou estornar.",
  amount_mismatch: "Valor pago diferente do total do pedido. Pedido NAO foi confirmado.",
  in_mediation: "Cliente abriu disputa no Mercado Pago. Responder pelo painel do MP.",
  unknown_status: "Status de pagamento desconhecido. Conferir no painel do MP.",
};

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
    // Sem o segredo, qualquer um que descubra a URL pode forjar notificacoes.
    // Em producao isso e configuracao errada: alerta (1x por hora).
    await notifyAdmin({
      kind: "business",
      title: "Webhook do Mercado Pago sem verificação de assinatura",
      fingerprintKey: "webhook|missing_secret",
      details: { acao: "Configurar MERCADOPAGO_WEBHOOK_SECRET na Vercel." },
    });
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
      await reportError("webhook: leitura do pedido", orderError.message, {
        pagamento: payment.id,
      });
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
        // Casos que pedem acao humana (estorno, disputa...). So ids e valores:
        // nada de nome/e-mail do cliente no alerta.
        await notifyAdmin({
          kind: "business",
          title: `Pagamento precisa de atenção (${decision.reason})`,
          // Um alerta por pedido+pagamento+motivo: reenvio do MP nao repete e-mail.
          fingerprintKey: `webhook|${decision.reason}|${order.id}|${payment.id}`,
          details: {
            motivo: ALERT_REASON_TEXT[decision.reason] ?? decision.reason,
            pedido: order.id,
            status_pedido: order.status,
            pagamento_mp: payment.id,
            status_mp: payment.status,
            total_pedido_centavos: order.total_cents,
            valor_pago_centavos: payment.amountCents,
          },
        });
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
      await reportError("webhook: advance_order_status", error.message, { pedido: order.id });
      return NextResponse.json({ error: "db" }, { status: 500 });
    }

    // Só notifica se HOUVE transição de verdade. O MP reenvia webhooks; sem
    // isto, um reenvio do mesmo pagamento mandaria e-mail duplicado ao cliente.
    if (changed === true) {
      await sendOrderStatusEmail(order.id, decision.to);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    await reportError("webhook", err, { pagamento: dataId });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
