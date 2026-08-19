import Link from "next/link";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { getCategories, getProducts } from "@/lib/queries/catalog";

export default async function Home() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const realCategories = categories.filter((c) => !c.is_custom_funnel);
  const funnel = categories.find((c) => c.is_custom_funnel);
  const highlights = products.slice(0, 4);

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
        <div className="flex size-24 items-center justify-center rounded-full border-4 border-secondary bg-card">
          <span className="font-display text-3xl text-primary">E</span>
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">@empoeirar</p>
        <h1 className="max-w-3xl text-5xl leading-tight sm:text-6xl">Empoeirar</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/80">
          Moldes e ferramentas de madeira para ceramistas, feitos à mão, um a um, em MDF. Puxadores
          entalhados para desmoldar sem marcar a borda das suas peças.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/produtos">Ver os produtos</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/personalizado">Um molde para chamar de seu!</Link>
          </Button>
        </div>
      </section>

      {/* Comprar por categoria */}
      <section className="bg-secondary/40 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Compre por</p>
          <h2 className="mb-8 font-display text-4xl text-primary">Categoria</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {realCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                description={category.description}
                href={`/produtos?categoria=${category.slug}`}
              />
            ))}
            {funnel ? (
              <CategoryCard
                name={funnel.name}
                description={funnel.description}
                href="/personalizado"
                cta="Encomendar o meu"
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Destaques */}
      {highlights.length > 0 ? (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-4xl text-primary">Alguns dos nossos moldes</h2>
              <Link href="/produtos" className="text-sm text-primary/80 hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {highlights.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
