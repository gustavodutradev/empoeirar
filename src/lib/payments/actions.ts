"use server";

import { env } from "@/env";
import { createPreference, isMercadoPagoConfigured } from "@/lib/payments/mercadopago";
import { createClient } from "@/lib/supabase/server";

type StartPaymentResult =
  | { ok: true; url: string }
  | { ok: false; error: string; unconfigured?: boolean };

/**
 * Inicia o pagamento de um pedido: cria a preference no MP e devolve o link do
 * checkout. Fronteira de confianca:
 *  - getUser (precisa estar logado);
 *  - o pedido e lido sob RLS (so o dono enxerga) e precisa estar
 *    'pending_payment' — nao se paga pedido alheio nem pedido ja pago;
 *  - se o MP ainda nao esta configurado, devolve unconfigured (o botao mostra
 *    aviso em vez de quebrar).
 */
export async function startPayment(orderId: string): Promise<StartPaymentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Você precisa estar logado." };
  }

  if (!isMercadoPagoConfigured()) {
    return {
      ok: false,
      unconfigured: true,
      error: "O pagamento online ainda não está disponível. Em breve!",
    };
  }

  // RLS garante que só lemos um pedido do próprio usuário.
  const { data: order } = await supabase
    .from("customer_order")
    .select("id, status, customer_email")
    .eq("id", orderId)
    .maybeSingle();

  if (order?.status !== "pending_payment") {
    return { ok: false, error: "Este pedido não está disponível para pagamento." };
  }

  const { data: items } = await supabase
    .from("order_item")
    .select("product_name, variant_label, unit_price_cents, quantity")
    .eq("order_id", orderId);

  if (!items || items.length === 0) {
    return { ok: false, error: "Pedido sem itens." };
  }

  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  try {
    const pref = await createPreference({
      orderId,
      payerEmail: order.customer_email ?? undefined,
      backUrl: `${base}/pedido/${orderId}?pagamento=retorno`,
      notificationUrl: `${base}/api/webhooks/mercadopago`,
      items: items.map((item) => ({
        title: `${item.product_name} — ${item.variant_label}`,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      })),
    });

    // Vincula a preference ao pedido (função definer checa que é do dono).
    const { error: attachError } = await supabase.rpc("attach_order_preference", {
      p_order_id: orderId,
      p_preference_id: pref.id,
    });
    if (attachError) {
      console.error("[startPayment] attach falhou:", attachError.message);
    }

    return { ok: true, url: pref.initPoint };
  } catch (err) {
    console.error("[startPayment] erro:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}
