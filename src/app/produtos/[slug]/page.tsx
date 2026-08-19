import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImage } from "@/components/site/product-image";
import { Button } from "@/components/ui/button";
import { formatBRL, mmToCm } from "@/lib/format";
import { getProductBySlug } from "@/lib/queries/catalog";
import { siteConfig } from "@/lib/site-config";

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

  const hasDimensions = product.length_mm !== null && product.width_mm !== null;
  const whatsappUrl = `${siteConfig.whatsappUrl}?text=${encodeURIComponent(
    `Olá! Tenho interesse no molde "${product.name}".`,
  )}`;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link href="/produtos" className="text-sm text-muted-foreground hover:text-primary">
        ← Voltar aos produtos
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductImage name={product.name} className="aspect-square w-full rounded-xl border" />

        <div className="flex flex-col gap-4">
          {product.category ? (
            <p className="text-sm uppercase tracking-wider text-muted-foreground">
              {product.category.name}
            </p>
          ) : null}

          <h1 className="font-display text-4xl text-primary">{product.name}</h1>
          <p className="text-2xl">{formatBRL(product.price_cents)}</p>

          {product.description ? (
            <p className="leading-relaxed text-foreground/80">{product.description}</p>
          ) : null}

          <dl className="mt-2 flex flex-col gap-2 border-t pt-4 text-sm">
            {hasDimensions ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Dimensões (maior peça):</dt>
                <dd>
                  {mmToCm(product.length_mm as number)} × {mmToCm(product.width_mm as number)} cm
                </dd>
              </div>
            ) : null}
            {product.height_mm !== null ? (
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Espessura:</dt>
                <dd>{product.height_mm} mm</dd>
              </div>
            ) : null}
            {product.material_care ? (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Material e cuidados:</dt>
                <dd>{product.material_care}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex flex-col gap-2">
            <Button asChild size="lg">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                Pedir pelo WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              O carrinho e o pagamento no site chegam na próxima fase. Por ora, o pedido é combinado
              pelo WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
