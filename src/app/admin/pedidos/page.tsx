import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { statusLabel } from "@/lib/checkout/status";
import { formatBRL, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin · Pedidos" };

export default async function AdminOrdersPage() {
  const { supabase } = await requireAdmin();

  // RLS: admin enxerga todos os pedidos (policy customer_order_select_admin).
  const { data: orders } = await supabase
    .from("customer_order")
    .select("id, status, total_cents, created_at, customer_name")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-3xl text-primary">Pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {orders?.length ?? 0} pedido(s). Clique para ver e mudar o status.
      </p>

      {orders && orders.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(order.created_at)}
                  </td>
                  <td className="px-4 py-3">{statusLabel(order.status)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatBRL(order.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-muted-foreground">Nenhum pedido ainda.</p>
      )}
    </div>
  );
}
