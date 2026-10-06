import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { decideUnpaidOrder, staleCutoff } from "@/lib/checkout/expiration";
import { notifyAdmin, reportError } from "@/lib/monitoring/report";
import { isMercadoPagoConfigured, searchPaymentsByOrder } from "@/lib/payments/mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pedidos por execução: cada um faz uma chamada ao MP. Sobra o resto para amanhã. */
const BATCH_SIZE = 40;

/**
 * Cron diário (vercel.json): cancela pedidos "aguardando pagamento" criados há
 * mais de 7 dias, desde que o Mercado Pago não tenha pagamento aprovado ou em
 * andamento para eles (item 26).
 *
 * Segurança: a rota é pública na internet, então só roda com o
 * `Authorization: Bearer <CRON_SECRET>` que a Vercel envia nos crons. Sem o
 * segredo configurado, recusa sempre (fail-closed).
 */
function isAuthorized(request: Request): boolean {
  if (!env.CRON_SECRET) return false;
  const received = request.headers.get("authorization") ?? "";
  // Compara hashes de tamanho fixo: timingSafeEqual exige tamanhos iguais e
  // comparar o tamanho antes vazaria o tamanho do segredo.
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(`Bearer ${env.CRON_SECRET}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("customer_order")
    .select("id, created_at")
    .eq("status", "pending_payment")
    .lt("created_at", staleCutoff(new Date()).toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    await reportError("cron expire-orders: leitura", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const summary = { found: orders.length, cancelled: 0, in_progress: 0, approved: 0, failed: 0 };
  const mpConfigured = isMercadoPagoConfigured();

  // Sequencial de propósito: poucas dezenas de pedidos, e assim não disparamos
  // rajadas contra a API do Mercado Pago.
  for (const order of orders) {
    try {
      // Sem MP configurado não existe pagamento possível: lista vazia.
      const payments = mpConfigured ? await searchPaymentsByOrder(order.id) : [];
      const decision = decideUnpaidOrder(payments);

      if (decision === "payment_in_progress") {
        summary.in_progress++;
        continue;
      }

      if (decision === "approved_not_confirmed") {
        // Dinheiro entrou e o pedido não foi confirmado: o webhook se perdeu.
        // Não cancela; alguém confere no painel do MP.
        summary.approved++;
        await notifyAdmin({
          kind: "business",
          title: "Pedido com pagamento aprovado e não confirmado",
          fingerprintKey: `cron|approved_not_confirmed|${order.id}`,
          details: {
            motivo:
              "O Mercado Pago tem pagamento aprovado, mas o pedido segue aguardando. Conferir no painel do MP e confirmar o pedido no admin.",
            pedido: order.id,
          },
        });
        continue;
      }

      const { data: changed, error: rpcError } = await admin.rpc("advance_order_status", {
        p_order_id: order.id,
        p_status: "cancelled",
        p_note: "Cancelado automaticamente: o pagamento não foi feito no prazo.",
        p_mp_payment_id: null,
        // Se o webhook confirmou o pagamento agora há pouco, não cancela.
        p_expected_status: "pending_payment",
      });
      if (rpcError) throw new Error(rpcError.message);
      if (changed === true) summary.cancelled++;
    } catch (err) {
      summary.failed++;
      await reportError("cron expire-orders", err, { pedido: order.id });
    }
  }

  // A resposta aparece em Settings > Cron Jobs da Vercel; o log so quando algo
  // falhou ou ficou pendente (o projeto so permite console.warn/error).
  if (summary.failed > 0 || summary.approved > 0) {
    console.warn("[cron expire-orders]", JSON.stringify(summary));
  }
  return NextResponse.json(summary);
}
