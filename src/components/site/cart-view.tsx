"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/site/product-image";
import { Button } from "@/components/ui/button";
import { selectTotalCents, useCart, useHasHydrated } from "@/lib/cart/store";
import { formatBRL, mmToCm, sizeLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type VariantRow = {
  id?: string;
  product_id: string;
  label: string;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
};

type LineDetail =
  | { isSet: true; setItems: { label: string; dims: string | null }[] }
  | { isSet: false; dims: string | null };

/** "26,5 × 26,5 cm · espessura 18 mm" (ou null se nao houver medida). */
function dimsText(v: Pick<VariantRow, "length_mm" | "width_mm" | "height_mm">): string | null {
  const parts: string[] = [];
  if (v.length_mm !== null && v.width_mm !== null) {
    parts.push(`${mmToCm(v.length_mm)} × ${mmToCm(v.width_mm)} cm`);
  }
  if (v.height_mm !== null) {
    // Molde plano (<= 20mm) -> "espessura"; forma 3D -> "altura".
    parts.push(`${v.height_mm > 20 ? "altura" : "espessura"} ${v.height_mm} mm`);
  }
  return parts.length ? parts.join(" · ") : null;
}

const isConjunto = (label: string) => label.trim().toLowerCase().startsWith("conjunto");

export function CartView() {
  const hydrated = useHasHydrated();
  const items = useCart((s) => s.items);
  const total = useCart(selectTotalCents);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);

  const [details, setDetails] = useState<Record<string, LineDetail>>({});
  const idsKey = items
    .map((i) => i.variantId)
    .sort()
    .join(",");

  // Busca no banco as dimensoes de cada item e, para "conjunto", as pecas que o
  // compoem (as variantes-irmas do mesmo produto). Refaz so quando muda o
  // conjunto de variantes no carrinho.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refetch apenas quando os ids mudam
  useEffect(() => {
    const variantIds = items.map((i) => i.variantId);
    if (variantIds.length === 0) {
      setDetails({});
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: cartVars } = await supabase
        .from("product_variant")
        .select("id, product_id, label, length_mm, width_mm, height_mm")
        .in("id", variantIds);
      if (!cartVars) return;

      const productIds = [...new Set(cartVars.map((v) => v.product_id))];
      const { data: allVars } = await supabase
        .from("product_variant")
        .select("product_id, label, length_mm, width_mm, height_mm, sort_order")
        .in("product_id", productIds)
        .order("sort_order");

      const byProduct = new Map<string, VariantRow[]>();
      for (const v of (allVars ?? []) as VariantRow[]) {
        const arr = byProduct.get(v.product_id) ?? [];
        arr.push(v);
        byProduct.set(v.product_id, arr);
      }

      const map: Record<string, LineDetail> = {};
      for (const v of cartVars as VariantRow[]) {
        if (!v.id) continue;
        if (isConjunto(v.label)) {
          const setItems = (byProduct.get(v.product_id) ?? [])
            .filter((s) => !isConjunto(s.label))
            .map((s) => ({ label: sizeLabel(s.label), dims: dimsText(s) }));
          map[v.id] = { isSet: true, setItems };
        } else {
          map[v.id] = { isSet: false, dims: dimsText(v) };
        }
      }
      if (!cancelled) setDetails(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

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
        {items.map((item) => {
          const detail = details[item.variantId];
          return (
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

                {/* Detalhe: conteudo do conjunto OU dimensoes do item */}
                {detail?.isSet && detail.setItems.length > 0 ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">Contém:</span>
                    <ul className="mt-0.5 flex flex-col gap-0.5">
                      {detail.setItems.map((s) => (
                        <li key={s.label}>
                          · {s.label}
                          {s.dims ? ` — ${s.dims}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : detail && !detail.isSet && detail.dims ? (
                  <span className="text-xs text-muted-foreground">{detail.dims}</span>
                ) : null}

                <span className="mt-1 text-sm">{formatBRL(item.priceCents)}</span>

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
          );
        })}
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
