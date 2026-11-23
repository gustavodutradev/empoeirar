import Link from "next/link";
import { DualPrice } from "@/components/site/dual-price";
import { ProductImage } from "@/components/site/product-image";

export function ProductCard({
  product,
}: {
  product: {
    name: string;
    slug: string;
    priceFromCents: number;
    cardFromCents: number;
    hasOptions: boolean;
    image?: string;
  };
}) {
  const cover = product.image;
  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <ProductImage
        name={product.name}
        src={cover}
        className="aspect-square w-full"
        // grade: 2 colunas no celular, 3 no tablet, até 4 no desktop (max-w-6xl)
        sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
      />
      <div className="flex flex-col gap-1 p-3 sm:p-4">
        <h3 className="font-display text-base leading-snug text-primary group-hover:underline sm:text-lg">
          {product.name}
        </h3>
        <DualPrice
          size="sm"
          prefix={product.hasOptions ? "a partir de" : undefined}
          pixCents={product.priceFromCents}
          cardCents={product.cardFromCents}
        />
      </div>
    </Link>
  );
}
