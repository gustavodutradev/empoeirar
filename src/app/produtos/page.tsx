import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import { getCategories, getProducts } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

export const metadata = { title: "Produtos" };

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground/80 hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const [categories, products] = await Promise.all([getCategories(), getProducts(categoria)]);
  const filters = categories.filter((c) => !c.is_custom_funnel);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <h1 className="font-display text-4xl text-primary">Produtos</h1>
      <p className="mt-2 text-muted-foreground">
        Moldes e ferramentas feitos à mão em MDF. Filtre por categoria.
      </p>

      <nav aria-label="Filtrar por categoria" className="mt-6 flex flex-wrap gap-2">
        <FilterChip href="/produtos" active={!categoria}>
          Todos
        </FilterChip>
        {filters.map((c) => (
          <FilterChip
            key={c.slug}
            href={`/produtos?categoria=${c.slug}`}
            active={categoria === c.slug}
          >
            {c.name}
          </FilterChip>
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="mt-12 text-muted-foreground">Nenhum produto nesta categoria por enquanto.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
