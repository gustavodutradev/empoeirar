import Link from "next/link";
import { ProductImage } from "@/components/site/product-image";
import { formatBRL } from "@/lib/format";

export function ProductCard({
  product,
}: {
  product: { name: string; slug: string; price_cents: number };
}) {
  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ProductImage name={product.name} className="aspect-square w-full" />
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-display text-lg text-primary group-hover:underline">{product.name}</h3>
        <span className="text-sm text-muted-foreground">{formatBRL(product.price_cents)}</span>
      </div>
    </Link>
  );
}
