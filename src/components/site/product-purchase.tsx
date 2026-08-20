"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBRL, mmToCm } from "@/lib/format";
import type { ProductVariant } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

/**
 * Bloco de compra: preco + seletor de variante (tamanho/quantidade) + dimensoes
 * da opcao escolhida + CTA. A variante selecionada e o que, na Fase 2, alimenta
 * o carrinho e o calculo de frete (peso/dimensoes vem dela).
 */
export function ProductPurchase({
  productName,
  variants,
  whatsappBaseUrl,
}: {
  productName: string;
  variants: ProductVariant[];
  whatsappBaseUrl: string;
}) {
  const defaultIndex = Math.max(
    0,
    variants.findIndex((v) => v.is_default),
  );
  const [index, setIndex] = useState(defaultIndex);
  const selected = variants[index];
  const hasOptions = variants.length > 1;

  const dims =
    selected.length_mm !== null && selected.width_mm !== null
      ? `${mmToCm(selected.length_mm)} × ${mmToCm(selected.width_mm)} cm`
      : null;

  const message = `Olá! Tenho interesse no molde "${productName}"${
    hasOptions ? ` (${selected.label})` : ""
  }.`;
  const whatsappUrl = `${whatsappBaseUrl}?text=${encodeURIComponent(message)}`;

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
                  <span className="font-medium">{variant.label}</span>
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

      <div className="flex flex-col gap-2">
        <Button asChild size="lg">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            Comprar
          </a>
        </Button>
        {/* <p className="text-xs text-muted-foreground">
          O carrinho e o pagamento no site chegam na próxima fase. Por ora, o pedido é combinado
          pelo WhatsApp.
        </p> */}
      </div>
    </div>
  );
}
