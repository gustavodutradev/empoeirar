import "server-only";
import { env } from "@/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { buildOrderEmail, type OrderEmailStatus } from "./templates";

/**
 * Dispara o e-mail transacional do pedido para o status dado. Chamado nos três
 * pontos onde o status muda: criação (pending_payment), webhook do MP (paid) e
 * admin (shipped/delivered).
 *
 * - Usa o cliente ADMIN (service_role) porque roda também no webhook, sem sessão
 *   de usuário. O destinatário é SEMPRE o e-mail do próprio pedido — nunca um
 *   endereço vindo de quem chama —, então não há como redirecionar o e-mail.
 * - NUNCA lança: tudo embrulhado em try/catch. Falha de e-mail não pode derrubar
 *   o checkout nem o webhook.
 * - Só notifica os status do escopo v1; os demais (preparing, cancelled) são
 *   ignorados silenciosamente.
 */

const NOTIFY: ReadonlySet<string> = new Set<OrderEmailStatus>([
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
]);

export async function sendOrderStatusEmail(orderId: string, status: string): Promise<void> {
  if (!NOTIFY.has(status)) return;

  try {
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("customer_order")
      .select(
        "id, customer_name, customer_email, subtotal_cents, shipping_cents, total_cents, ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order?.customer_email) return;

    const { data: items } = await admin
      .from("order_item")
      .select("product_name, variant_label, quantity, line_total_cents")
      .eq("order_id", orderId);

    const { subject, html } = buildOrderEmail(status as OrderEmailStatus, {
      id: order.id,
      shortId: order.id.slice(0, 8).toUpperCase(),
      customerName: order.customer_name ?? "",
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      address: {
        street: order.ship_street ?? "",
        number: order.ship_number ?? "",
        complement: order.ship_complement ?? "",
        district: order.ship_district ?? "",
        city: order.ship_city ?? "",
        state: order.ship_state ?? "",
        cep: order.ship_cep ?? "",
      },
      items: (items ?? []).map((i) => ({
        name: i.product_name,
        variant: i.variant_label,
        quantity: i.quantity,
        lineTotalCents: i.line_total_cents,
      })),
      siteUrl: env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""),
    });

    await sendEmail({ to: order.customer_email, subject, html });
  } catch (err) {
    console.error("[order-email] falha:", err instanceof Error ? err.message : err);
  }
}
