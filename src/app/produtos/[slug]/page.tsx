import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCarousel } from "@/components/site/product-carousel";
import { ProductPurchase } from "@/components/site/product-purchase";
import { getProductBySlug } from "@/lib/queries/catalog";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images = product.images;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12">
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
