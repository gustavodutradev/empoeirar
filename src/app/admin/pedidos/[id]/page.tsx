import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOrderStatus } from "@/components/site/admin-order-status";
import { requireAdmin } from "@/lib/admin/guard";
import { statusLabel } from "@/lib/checkout/status";
import { formatBRL, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Pedido" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminOrderDetail({ params }: Params) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: order } = await supabase
    .from("customer_order")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("order_item")
      .select("id, product_name, variant_label, unit_price_cents, quantity, line_total_cents")
      .eq("order_id", order.id),
    supabase
      .from("order_status_event")
      .select("id, status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:text-primary">
        ← Todos os pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-3xl text-primary">
          Pedido {order.id.slice(0, 8).toUpperCase()}
        </h1>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(order.created_at)} · {statusLabel(order.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Controle de status */}
        <div className="md:col-span-2">
          <AdminOrderStatus orderId={order.id} currentStatus={order.status} />
        </div>

        {/* Cliente */}
        <section className="rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-display text-lg text-primary">Cliente</h2>
          <dl className="mt-2 flex flex-col gap-1">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Nome:</dt>
              <dd>{order.customer_name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">CPF:</dt>
              <dd className="tabular-nums">{order.customer_cpf}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Telefone:</dt>
              <dd className="tabular-nums">{order.customer_phone}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">E-mail:</dt>
              <dd>{order.customer_email}</dd>
            </div>
          </dl>
        </section>

        {/* Entrega */}
        <section className="rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-display text-lg text-primary">Entrega</h2>
          <address className="mt-2 not-italic text-foreground/80">
            {order.ship_street}, {order.ship_number}
            {order.ship_complement ? ` — ${order.ship_complement}` : ""}
            <br />
            {order.ship_district} · {order.ship_city}/{order.ship_state}
            <br />
            CEP {order.ship_cep}
          </address>
        </section>

        {/* Itens */}
        <section className="rounded-xl border bg-card p-4 md:col-span-2">
          <h2 className="font-display text-lg text-primary">Itens</h2>
          <ul className="mt-2 flex flex-col divide-y text-sm">
            {(items ?? []).map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-2">
                <span>
                  {item.quantity}× {item.product_name}
                  <span className="block text-xs text-muted-foreground">{item.variant_label}</span>
                </span>
                <span className="tabular-nums">{formatBRL(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatBRL(order.total_cents)}</span>
          </div>
        </section>

        {/* Linha do tempo */}
        <section className="rounded-xl border bg-card p-4 md:col-span-2">
          <h2 className="font-display text-lg text-primary">Histórico</h2>
          <ol className="mt-3 flex flex-col gap-3 text-sm">
            {(events ?? []).map((event) => (
              <li key={event.id} className="flex flex-col">
                <span className="font-medium">{statusLabel(event.status)}</span>
                {event.note ? <span className="text-muted-foreground">{event.note}</span> : null}
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(event.created_at)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
