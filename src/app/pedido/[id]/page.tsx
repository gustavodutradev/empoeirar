import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PayButton } from "@/components/site/pay-button";
import {
  isOrderStatus,
  ORDER_FLOW,
  ORDER_PAGE_HEADLINE,
  ORDER_STATUS,
} from "@/lib/checkout/status";
import { formatBRL, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seu pedido" };

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pagamento?: string }>;
};

export default async function OrderPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { pagamento } = await searchParams;

  // id malformado nunca chega ao banco (evita erro de cast uuid no Postgres) nem
  // é ecoado no ?next= do login.
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/entrar?next=/pedido/${id}`);
  }

  // RLS faz o trabalho pesado: mesmo passando um id de outro usuário, a policy
  // "select_own" devolve zero linhas. Não precisamos filtrar por user_id aqui —
  // o banco já garante que ninguém vê o pedido alheio (anti-IDOR).
  const { data: order } = await supabase
    .from("customer_order")
    .select(
      "id, status, subtotal_cents, shipping_cents, total_cents, created_at, customer_name, customer_email, ship_cep, ship_street, ship_number, ship_complement, ship_district, ship_city, ship_state",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("order_item")
      .select(
        "id, product_name, variant_label, unit_price_cents, quantity, line_total_cents, product_variant(product(slug))",
      )
      .eq("order_id", order.id),
    supabase
      .from("order_status_event")
      .select("id, status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
  ]);

  const shortId = order.id.slice(0, 8).toUpperCase();
  const reachedStatuses = new Set((events ?? []).map((e) => e.status));
  // Status desconhecido (enum novo no banco sem texto aqui) cai num título neutro.
  const headline = isOrderStatus(order.status)
    ? ORDER_PAGE_HEADLINE[order.status]
    : { title: "Seu pedido", lead: "" };
  const lead = headline.lead.replace("{email}", order.customer_email ?? "seu e-mail");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-xl border bg-card p-5 text-center sm:p-6">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          Pedido nº {shortId}
        </p>
        <h1 className="mt-1 font-display text-3xl text-primary">{headline.title}</h1>
        {lead ? <p className="mt-2 text-muted-foreground">{lead}</p> : null}

        {order.status === "pending_payment" ? (
          <div className="mt-6">
            {pagamento === "retorno" ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Recebemos seu retorno do Mercado Pago. Assim que o pagamento for confirmado, o
                status abaixo é atualizado automaticamente.
              </p>
            ) : null}
            <PayButton orderId={order.id} />
          </div>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl text-primary">Acompanhamento</h2>
        <ol className="mt-4 flex flex-col gap-0">
          {ORDER_FLOW.map((status, i) => {
            const reached = reachedStatuses.has(status);
            const event = (events ?? []).find((e) => e.status === status);
            const isLast = i === ORDER_FLOW.length - 1;
            return (
              <li key={status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      reached
                        ? "mt-1 size-3 rounded-full bg-primary"
                        : "mt-1 size-3 rounded-full border border-muted-foreground/40 bg-background"
                    }
                    aria-hidden
                  />
                  {!isLast ? (
                    <span
                      className={reached ? "w-px flex-1 bg-primary/40" : "w-px flex-1 bg-border"}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className={isLast ? "pb-0" : "pb-6"}>
                  <p className={reached ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {ORDER_STATUS[status].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event?.note ?? ORDER_STATUS[status].description}
                  </p>
                  {event ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-primary">Itens</h2>
        <ul className="mt-4 flex flex-col divide-y">
          {(items ?? []).map((item) => {
            // Embed é objeto em runtime (relação muitos-para-um); o tipo gerado
            // sem Database generic assume array, por isso o cast.
            const slug = (item.product_variant as { product?: { slug?: string } } | null)?.product
              ?.slug;
            return (
              <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  {item.quantity}×{" "}
                  {slug ? (
                    <Link href={`/produtos/${slug}`} className="text-primary hover:underline">
                      {item.product_name}
                    </Link>
                  ) : (
                    item.product_name
                  )}
                  <span className="block text-xs text-muted-foreground">{item.variant_label}</span>
                </span>
                <span className="tabular-nums">{formatBRL(item.line_total_cents)}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col gap-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatBRL(order.subtotal_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span className="text-muted-foreground">
              {order.shipping_cents === null ? "a calcular" : formatBRL(order.shipping_cents)}
            </span>
          </div>
          <div className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatBRL(order.total_cents)}</span>
          </div>
        </div>
      </section>

      <section className="mt-8 text-sm">
        <h2 className="font-display text-xl text-primary">Entrega</h2>
        <address className="mt-3 not-italic text-foreground/80">
          {order.customer_name}
          <br />
          {order.ship_street}, {order.ship_number}
          {order.ship_complement ? ` — ${order.ship_complement}` : ""}
          <br />
          {order.ship_district} · {order.ship_city}/{order.ship_state}
          <br />
          CEP {order.ship_cep}
        </address>
      </section>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/produtos" className="py-2 text-base text-muted-foreground hover:text-primary">
          ← Continuar comprando
        </Link>
        <Link href="/conta" className="py-2 text-base text-muted-foreground hover:text-primary">
          Minha conta
        </Link>
      </div>
    </main>
  );
}
