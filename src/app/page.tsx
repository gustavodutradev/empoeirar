import Link from "next/link";
import { CategoryCard } from "@/components/site/category-card";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { getProductImages } from "@/lib/product-images";
import { getCategories, getCategoryPreviews, getProducts } from "@/lib/queries/catalog";

export default async function Home() {
  const [categories, products, previews] = await Promise.all([
    getCategories(),
    getProducts(),
    getCategoryPreviews(),
  ]);
  const realCategories = categories.filter((c) => !c.is_custom_funnel);
  const funnel = categories.find((c) => c.is_custom_funnel);
  const highlights = products.slice(0, 4);

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 sm:py-20">
        <h1 className="sr-only">Empoeirar</h1>
        {/* biome-ignore lint/performance/noImgElement: logo local em public/, sem otimização remota */}
        <img src="/logo-empoeirar.png" alt="Empoeirar" className="h-32 w-auto sm:h-52" />
        <p className="max-w-2xl text-lg leading-relaxed text-foreground/90 sm:text-xl">
          Moldes e ferramentas de madeira para ceramistas, feitos à mão, um a um, em MDF. Puxadores
          entalhados para desmoldar sem marcar a borda das suas peças.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/produtos">Ver os produtos</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/personalizado">Um molde para chamar de seu!</Link>
          </Button>
        </div>
      </section>

      <section className="bg-secondary/40 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Compre por</p>
          <h2 className="mb-6 font-display text-3xl text-primary sm:mb-8 sm:text-4xl">Categoria</h2>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {realCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                description={category.description}
                href={`/produtos?categoria=${category.slug}`}
                image={previews[category.slug]}
              />
            ))}
            {funnel ? (
              <CategoryCard
                name={funnel.name}
                description={funnel.description}
                href="/personalizado"
                cta="Encomendar o meu"
                image={previews[funnel.slug] ?? getProductImages("molde-personalizado")[0]}
              />
            ) : null}
          </div>
        </div>
      </section>

      {highlights.length > 0 ? (
        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
              <h2 className="font-display text-3xl text-primary sm:text-4xl">
                Alguns dos nossos moldes
              </h2>
              <Link
                href="/produtos"
                className="shrink-0 py-2 text-base text-primary/80 hover:underline"
              >
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
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
