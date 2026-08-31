import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Admin · Produtos" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export default async function AdminProductsPage() {
  const { supabase } = await requireAdmin();

  // Admin enxerga todos os status (policy product_write_admin cobre o select).
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("product").select("id, name, status, category_id").order("name"),
    supabase.from("category").select("id, name"),
  ]);

  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products?.length ?? 0} produto(s). Clique para editar campos, preços, peso e dimensões.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo">+ Novo produto</Link>
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className="border-b last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/produtos/${product.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {catName.get(product.category_id) ?? "—"}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[product.status] ?? product.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
