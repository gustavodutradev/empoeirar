"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { formatBRL, mmToCm, sizeLabel } from "@/lib/format";
import type { ProductVariant } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

/**
 * Bloco de compra: preco + seletor de variante (tamanho/quantidade) + contador
 * de quantidade + CTA. A variante escolhida e a quantidade sao o que, na Fase 2,
 * alimentam o carrinho e o calculo de frete (peso/dimensoes vem da variante).
 */
export function ProductPurchase({
  variants,
  productName,
  productSlug,
  image,
}: {
  variants: ProductVariant[];
  productName: string;
  productSlug: string;
  image?: string;
}) {
  const addItem = useCart((s) => s.addItem);
  const defaultIndex = Math.max(
    0,
    variants.findIndex((v) => v.is_default),
  );
  const [index, setIndex] = useState(defaultIndex);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = variants[index];
  const hasOptions = variants.length > 1;

  function handleAddToCart() {
    addItem(
      {
        variantId: selected.id,
        productSlug,
        productName,
        variantLabel: sizeLabel(selected.label),
        priceCents: selected.price_cents,
        image,
      },
      quantity,
    );
    setQuantity(1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  const dims =
    selected.length_mm !== null && selected.width_mm !== null
      ? `${mmToCm(selected.length_mm)} × ${mmToCm(selected.width_mm)} cm`
      : null;

  // Molde plano (<= 20mm) -> "Espessura"; forma 3D (copo/prato) -> "Altura".
  const heightLabel =
    selected.height_mm !== null && selected.height_mm > 20 ? "Altura" : "Espessura";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-3xl text-foreground">{formatBRL(selected.price_cents)}</p>

      {hasOptions ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted-foreground">Escolha a opção:</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant, i) => {
              const active = i === index;
              const vDims =
                variant.length_mm !== null && variant.width_mm !== null
                  ? `${mmToCm(variant.length_mm)} × ${mmToCm(variant.width_mm)} cm`
                  : null;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:border-primary",
                  )}
                >
                  <span className="font-medium">{sizeLabel(variant.label)}</span>
                  <span
                    className={cn(active ? "text-primary-foreground/80" : "text-muted-foreground")}
                  >
                    {formatBRL(variant.price_cents)}
                    {vDims ? ` · ${vDims}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <dl className="flex flex-col gap-2 border-t pt-4 text-sm">
        {dims ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Dimensões:</dt>
            <dd>{dims}</dd>
          </div>
        ) : null}
        {selected.height_mm !== null ? (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{heightLabel}:</dt>
            <dd>{selected.height_mm} mm</dd>
          </div>
        ) : null}
      </dl>

      {/* Quantidade */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Quantidade</span>
        <div className="flex items-center rounded-lg border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Diminuir quantidade"
            className="flex size-9 items-center justify-center rounded-l-lg text-primary transition-colors hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-10 text-center tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Aumentar quantidade"
            className="flex size-9 items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <Button type="button" size="lg" onClick={handleAddToCart}>
        {added ? "Adicionado ✓" : "Adicionar ao Carrinho"}
      </Button>
    </div>
  );
}
