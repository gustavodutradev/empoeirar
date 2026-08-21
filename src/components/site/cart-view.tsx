"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "@/components/site/product-image";
import { Button } from "@/components/ui/button";
import { selectTotalCents, useCart, useHasHydrated } from "@/lib/cart/store";
import { formatBRL } from "@/lib/format";

export function CartView() {
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const total = useCart(selectTotalCents);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);

  // Enquanto nao hidratou, nao renderiza o estado (evita flash/mismatch).
  if (!hydrated) {
    return <div className="min-h-40" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Seu carrinho está vazio.</p>
        <Button asChild size="lg">
          <Link href="/produtos">Ver os produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Itens */}
      <ul className="flex flex-1 flex-col divide-y">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 py-4">
            <ProductImage
              name={item.productName}
              src={item.image}
              className="size-24 shrink-0 rounded-lg border"
            />

            <div className="flex flex-1 flex-col gap-1">
              <Link
                href={`/produtos/${item.productSlug}`}
                className="font-display text-lg text-primary hover:underline"
              >
                {item.productName}
              </Link>
              <span className="text-sm text-muted-foreground">{item.variantLabel}</span>
              <span className="text-sm">{formatBRL(item.priceCents)}</span>

              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Diminuir quantidade"
                    className="flex size-8 items-center justify-center rounded-l-lg text-primary transition-colors hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                    className="flex size-8 items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-secondary"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Remover
                </button>
              </div>
            </div>

            <div className="text-right font-medium tabular-nums">
              {formatBRL(item.priceCents * item.quantity)}
            </div>
          </li>
        ))}
      </ul>

      {/* Resumo */}
      <aside className="w-full shrink-0 rounded-xl border bg-card p-6 lg:w-80">
        <h2 className="font-display text-xl text-primary">Resumo</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">{formatBRL(total)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          O frete é calculado no checkout, conforme o CEP.
        </p>

        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/checkout">Finalizar compra</Link>
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Você precisa estar logado para concluir.
        </p>

        <button
          type="button"
          onClick={clear}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-destructive"
        >
          Limpar carrinho
        </button>
      </aside>
    </div>
  );
}
