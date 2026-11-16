import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { type OrderAge, orderAge, PRODUCTION_DEADLINE_DAYS } from "@/lib/admin/order-age";
import { DEFAULT_ORDER_FILTER, ORDER_FILTERS, parseOrderFilter } from "@/lib/admin/order-filters";
import { statusLabel } from "@/lib/checkout/status";
import { formatBRL, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Pedidos" };

/** Teto da listagem. Sem paginação por enquanto; o filtro padrão mostra poucos. */
const LIST_LIMIT = 200;

type Props = { searchParams: Promise<{ status?: string | string[] }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { supabase } = await requireAdmin();
  const filter = parseOrderFilter((await searchParams).status);
  const isOpenView = filter.key === DEFAULT_ORDER_FILTER.key;

  // RLS: admin enxerga todos os pedidos e itens (policies *_select_admin).
  let query = supabase
    .from("customer_order")
    .select(
      `id, status, total_cents, shipping_cents, shipping_service, created_at, paid_at, shipped_at,
       customer_name, customer_phone, customer_email,
       ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state, ship_cep,
       order_item (id, product_name, variant_label, quantity, line_total_cents)`,
    )
    .limit(LIST_LIMIT);

  if (filter.statuses) query = query.in("status", filter.statuses);

  // Em aberto: o que está há mais tempo esperando vem primeiro.
  query = isOpenView
    ? query.order("paid_at", { ascending: true, nullsFirst: false })
    : query.order("created_at", { ascending: false });

  const { data: orders } = await query;
  const now = new Date();

  return (
    <div>
      <h1 className="font-display text-3xl text-primary">Pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {orders?.length ?? 0} pedido(s) em “{filter.label}”. Toque em um pedido para ver os
        detalhes. O contador mostra os dias corridos desde o pagamento (prazo de{" "}
        {PRODUCTION_DEADLINE_DAYS} dias).
      </p>

      <nav aria-label="Filtrar por status" className="mt-4 flex flex-wrap gap-2">
        {ORDER_FILTERS.map((f) => {
          const active = f.key === filter.key;
          const href = f.key === DEFAULT_ORDER_FILTER.key ? "/admin/pedidos" : `?status=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent/50"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {orders && orders.length > 0 ? (
        <>
          <div
            aria-hidden="true"
            className="mt-6 hidden grid-cols-[6rem_1fr_9rem_5rem_9rem_7rem] gap-x-4 px-4 text-xs uppercase tracking-wider text-muted-foreground sm:grid"
          >
            <span>Pedido</span>
            <span>Cliente</span>
            <span>Data</span>
            <span>Prazo</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <ul className="mt-2 flex flex-col gap-3">
            {orders.map((order) => {
              const age = orderAge(order, now);
              return (
                <li key={order.id}>
                  <details className="group rounded-xl border bg-card">
                    <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-x-4 gap-y-1 p-4 text-sm sm:grid-cols-[6rem_1fr_9rem_5rem_9rem_7rem] [&::-webkit-details-marker]:hidden">
                      <span className="font-medium text-primary">
                        {order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="truncate">{order.customer_name}</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </span>
                      <AgeBadge age={age} />
                      <span>{statusLabel(order.status)}</span>
                      <span className="text-right tabular-nums">
                        {formatBRL(order.total_cents)}
                      </span>
                    </summary>

                    <div className="grid gap-4 border-t p-4 text-sm md:grid-cols-3">
                      <section>
                        <h2 className="font-medium">Itens</h2>
                        <ul className="mt-1 flex flex-col gap-1">
                          {order.order_item.map((item) => (
                            <li key={item.id} className="flex justify-between gap-3">
                              <span>
                                {item.quantity}× {item.product_name}
                                <span className="block text-xs text-muted-foreground">
                                  {item.variant_label}
                                </span>
                              </span>
                              <span className="tabular-nums">
                                {formatBRL(item.line_total_cents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h2 className="font-medium">Entrega</h2>
                        <address className="mt-1 not-italic text-foreground/80">
                          {order.ship_street}, {order.ship_number}
                          {order.ship_complement ? ` — ${order.ship_complement}` : ""}
                          <br />
                          {order.ship_district} · {order.ship_city}/{order.ship_state}
                          <br />
                          CEP {order.ship_cep}
                        </address>
                        {order.shipping_service ? (
                          <p className="mt-1 text-muted-foreground">
                            {order.shipping_service}
                            {order.shipping_cents != null
                              ? ` · ${formatBRL(order.shipping_cents)}`
                              : ""}
                          </p>
                        ) : null}
                      </section>

                      <section className="flex flex-col gap-1">
                        <h2 className="font-medium">Contato</h2>
                        <span className="tabular-nums">{order.customer_phone}</span>
                        <span className="break-all">{order.customer_email}</span>
                        {order.paid_at ? (
                          <span className="text-muted-foreground">
                            Pago em {formatDateTime(order.paid_at)}
                          </span>
                        ) : null}
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="mt-2 font-medium text-primary hover:underline"
                        >
                          Abrir pedido e mudar status →
                        </Link>
                      </section>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-muted-foreground">Nenhum pedido em “{filter.label}”.</p>
      )}
    </div>
  );
}

const AGE_STYLE: Record<OrderAge["tone"], string> = {
  ok: "bg-secondary text-foreground",
  warning: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  late: "bg-destructive text-destructive-foreground",
  done: "text-muted-foreground",
};

function AgeBadge({ age }: { age: OrderAge | null }) {
  if (!age) return <span className="text-muted-foreground">—</span>;
  const label = age.days === 1 ? "1 dia" : `${age.days} dias`;
  const title =
    age.tone === "done"
      ? `Enviado ${label} depois do pagamento`
      : age.tone === "late"
        ? `Passou do prazo de ${PRODUCTION_DEADLINE_DAYS} dias`
        : `${label} desde o pagamento`;
  return (
    <span
      title={title}
      className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${AGE_STYLE[age.tone]}`}
    >
      {label}
    </span>
  );
}
