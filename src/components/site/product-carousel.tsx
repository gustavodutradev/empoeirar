"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/site/product-image";
import { cn } from "@/lib/utils";

export function ProductCarousel({ name, images }: { name: string; images: string[] }) {
  const [index, setIndex] = useState(0);
  // Posicao X do inicio do toque, para detectar swipe horizontal no mobile.
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return <ProductImage name={name} className="aspect-square w-full rounded-xl border" />;
  }

  const go = (i: number) => setIndex((i + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative touch-pan-y"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          const end = e.changedTouches[0]?.clientX;
          if (start === null || end === undefined || images.length < 2) return;
          const dx = end - start;
          // Limiar de 40px: evita trocar de foto num toque/rolagem acidental.
          if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
        }}
      >
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
              className="-translate-y-1/2 absolute top-1/2 left-2 flex size-10 items-center justify-center rounded-full border bg-card/90 text-primary shadow-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Próxima imagem"
              className="-translate-y-1/2 absolute top-1/2 right-2 flex size-10 items-center justify-center rounded-full border bg-card/90 text-primary shadow-sm transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
