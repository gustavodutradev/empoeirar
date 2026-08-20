import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCarousel } from "@/components/site/product-carousel";
import { ProductPurchase } from "@/components/site/product-purchase";
import { getProductImages } from "@/lib/product-images";
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

  const images = getProductImages(product.slug);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link href="/produtos" className="text-sm text-muted-foreground hover:text-primary">
        ← Voltar aos produtos
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductCarousel name={product.name} images={images} />

        <div className="flex flex-col gap-4">
          {product.category ? (
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="font-display text-4xl text-primary">{product.name}</h1>

          {product.description ? (
            <p className="leading-relaxed text-foreground/80">{product.description}</p>
          ) : null}

          <ProductPurchase variants={product.variants} />

          {product.material_care ? (
            <div className="border-t pt-4 text-sm">
              <p className="text-muted-foreground">Material e cuidados:</p>
              <p className="mt-1 text-foreground/80">{product.material_care}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
