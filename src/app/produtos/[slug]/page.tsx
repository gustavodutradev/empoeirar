import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/json-ld";
import { ProductCarousel } from "@/components/site/product-carousel";
import { ProductPurchase } from "@/components/site/product-purchase";
import { env } from "@/env";
import { defaultOpenGraph } from "@/lib/metadata";
import { getProductBySlug } from "@/lib/queries/catalog";
import { absoluteUrl, buildProductJsonLd, ogImagePath, productDescription } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };

  const path = `/produtos/${product.slug}`;
  const description = productDescription({
    name: product.name,
    description: product.description,
    minPriceCents: minPrice(product.variants),
  });
  const cover = product.images[0];

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...defaultOpenGraph,
      url: path,
      title: product.name,
      description,
      // Foto do produto redimensionada (1200px); sem foto, fica a logo padrão.
      images: cover
        ? [{ url: ogImagePath(cover), width: 1200, alt: product.name }]
        : defaultOpenGraph.images,
    },
  };
}

function minPrice(variants: { price_cents: number }[]): number | null {
  const prices = variants.map((v) => v.price_cents).filter((c) => c > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images = product.images;
  // Dados estruturados para o Google (preço e disponibilidade nos resultados).
  // Mesma consulta da página: o que o Google lê é o que o cliente vê.
  const jsonLd = buildProductJsonLd(
    {
      id: product.id,
      name: product.name,
      description: product.description,
      url: absoluteUrl(env.NEXT_PUBLIC_SITE_URL, `/produtos/${product.slug}`),
      images,
      variants: product.variants,
    },
    siteConfig.name,
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <Link
        href="/produtos"
        className="inline-flex min-h-10 items-center text-base text-muted-foreground hover:text-primary"
      >
        ← Voltar aos produtos
      </Link>

      <div className="mt-2 grid gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
        <ProductCarousel name={product.name} images={images} />

        <div className="flex flex-col gap-4">
          {product.category ? (
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="font-display text-3xl leading-tight text-primary sm:text-4xl">
            {product.name}
          </h1>

          {product.description ? (
            <p className="text-lg leading-relaxed text-foreground/85">{product.description}</p>
          ) : null}

          <ProductPurchase
            variants={product.variants}
            productName={product.name}
            productSlug={product.slug}
            image={images[0]}
          />

          {product.material_care ? (
            <div className="border-t pt-4 text-base">
              <p className="text-muted-foreground">Material e cuidados:</p>
              <p className="mt-1 leading-relaxed text-foreground/85">{product.material_care}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
