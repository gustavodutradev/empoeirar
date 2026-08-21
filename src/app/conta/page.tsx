import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { statusLabel } from "@/lib/checkout/status";
import { formatBRL, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guarda de rota NO SERVIDOR. Nunca confie em esconder o link no header: a
  // pagina em si precisa barrar acesso anonimo. Guardamos o caminho em `next`
  // pra voltar aqui depois do login.
  if (!user) {
    redirect("/entrar?next=/conta");
  }

  // RLS já filtra para os pedidos do próprio usuário.
  const { data: orders } = await supabase
    .from("customer_order")
    .select("id, status, total_cents, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-4xl text-primary">Minha conta</h1>
      <p className="mt-4 text-foreground/80">
        Você está conectado como <span className="text-foreground">{user.email}</span>.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl text-primary">Meus pedidos</h2>
        {orders && orders.length > 0 ? (
          <ul className="mt-4 flex flex-col divide-y rounded-xl border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/pedido/${order.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <span>
                    <span className="font-medium">
                      Pedido nº {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)} · {statusLabel(order.status)}
                    </span>
                  </span>
                  <span className="tabular-nums text-sm">{formatBRL(order.total_cents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não tem pedidos.{" "}
            <Link href="/produtos" className="text-primary hover:underline">
              Ver produtos
            </Link>
            .
          </p>
        )}
      </section>

      <form action="/auth/signout" method="post" className="mt-10">
        <button
          type="submit"
          className="rounded-md border px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Sair da conta
        </button>
      </form>
    </main>
  );
}
