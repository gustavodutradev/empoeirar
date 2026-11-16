import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/guard";
import {
  filterProducts,
  hasActiveFilters,
  hasMissingMeasures,
  PRODUCT_ISSUES,
  PRODUCT_STATUSES,
  type ProductRow,
  parseProductFilters,
} from "@/lib/admin/product-filters";

export const metadata: Metadata = { title: "Admin · Produtos" };

type Raw = string | string[] | undefined;
type Props = {
  searchParams: Promise<{ q?: Raw; status?: Raw; categoria?: Raw; pendencia?: Raw }>;
};

type Row = ProductRow & { id: string };

const FIELD =
  "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function AdminProductsPage({ searchParams }: Props) {
  const { supabase } = await requireAdmin();

  // Admin enxerga todos os status (policy product_write_admin cobre o select).
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("product")
      .select(
        "id, name, status, category_id, product_image (id), product_variant (weight_grams, length_mm, width_mm, height_mm)",
      )
      .order("name"),
    supabase.from("category").select("id, name").order("name"),
  ]);

  const catName = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]));
  const filters = parseProductFilters(await searchParams, new Set(catName.keys()));
  const all = (products ?? []) as Row[];
  const visible = filterProducts(all, filters);
  const filtered = hasActiveFilters(filters);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-primary">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered ? `${visible.length} de ${all.length}` : all.length} produto(s). Clique para
            editar campos, preços, peso e dimensões.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/produtos/novo">+ Novo produto</Link>
        </Button>
      </div>

      {/* GET: os filtros ficam na URL (dá para salvar o link) e não precisa de JS. */}
      <search>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Buscar
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              maxLength={80}
              placeholder="Nome do produto"
              className={`${FIELD} w-56`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Status
            <select name="status" defaultValue={filters.status ?? ""} className={FIELD}>
              <option value="">Todos</option>
              {Object.entries(PRODUCT_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Categoria
            <select name="categoria" defaultValue={filters.categoryId ?? ""} className={FIELD}>
              <option value="">Todas</option>
              {[...catName].map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Pendência
            <select name="pendencia" defaultValue={filters.issue ?? ""} className={FIELD}>
              <option value="">Nenhuma</option>
              {Object.entries(PRODUCT_ISSUES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          {filtered ? (
            <Link href="/admin/produtos" className="h-10 content-center text-sm hover:underline">
              Limpar
            </Link>
          ) : null}
        </form>
      </search>

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Pendências</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => {
              const issues = [
                product.product_image.length === 0 ? PRODUCT_ISSUES.sem_foto : null,
                hasMissingMeasures(product) ? PRODUCT_ISSUES.sem_medidas : null,
              ].filter((x) => x !== null);
              return (
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
                  <td className="px-4 py-3">
                    {PRODUCT_STATUSES[product.status as keyof typeof PRODUCT_STATUSES] ??
                      product.status}
                  </td>
                  <td className="px-4 py-3">
                    {issues.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {issues.map((issue) => (
                          <span
                            key={issue}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                          >
                            {issue}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum produto com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
