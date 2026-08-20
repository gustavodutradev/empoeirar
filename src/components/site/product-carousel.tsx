"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ProductImage } from "@/components/site/product-image";
import { cn } from "@/lib/utils";

export function ProductCarousel({ name, images }: { name: string; images: string[] }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return <ProductImage name={name} className="aspect-square w-full rounded-xl border" />;
  }

  const go = (i: number) => setIndex((i + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <ProductImage
          name={name}
          src={images[index]}
          className="aspect-square w-full rounded-xl border"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Imagem anterior"
              className="-translate-y-1/2 absolute top-1/2 left-2 flex size-9 items-center justify-center rounded-full border bg-card/90 text-primary shadow-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Próxima imagem"
              className="-translate-y-1/2 absolute top-1/2 right-2 flex size-9 items-center justify-center rounded-full border bg-card/90 text-primary shadow-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "overflow-hidden rounded-lg border transition-opacity",
                i === index ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
              )}
            >
              <ProductImage name={name} src={img} className="aspect-square w-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
