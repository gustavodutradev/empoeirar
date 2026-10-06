import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import { getCategories, getProducts } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

type SearchParams = { searchParams: Promise<{ categoria?: string }> };

/**
 * Cada categoria (?categoria=slug) é uma página própria para o Google, com
 * título e canonical próprios. Só vale para categoria que EXISTE: um valor
 * qualquer na URL não vira canonical (nem título) de página nenhuma.
 */
export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const { categoria } = await searchParams;
  const category = categoria
    ? (await getCategories()).find((c) => c.slug === categoria && !c.is_custom_funnel)
    : undefined;

  if (!category) {
    return { title: "Produtos", alternates: { canonical: "/produtos" } };
  }
  return {
    title: `${category.name} · Produtos`,
    description: category.description ?? undefined,
    alternates: { canonical: `/produtos?categoria=${encodeURIComponent(category.slug)}` },
  };
}

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
        "flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-base transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground/80 hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ProdutosPage({ searchParams }: SearchParams) {
  const { categoria } = await searchParams;
  const [categories, products] = await Promise.all([getCategories(), getProducts(categoria)]);
  const filters = categories.filter((c) => !c.is_custom_funnel);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-3xl text-primary sm:text-4xl">Produtos</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Moldes e ferramentas feitos à mão em MDF. Filtre por categoria.
      </p>

      <nav
        aria-label="Filtrar por categoria"
        className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
