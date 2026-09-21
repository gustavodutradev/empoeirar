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
            <li key={item.variantId} className="flex gap-3 py-5 sm:gap-4">
              <ProductImage
                name={item.productName}
                src={item.image}
                className="size-20 shrink-0 rounded-lg border sm:size-24"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {/* Nome + total da linha na mesma linha: no mobile nao sobra
                    largura para uma coluna de preco separada. */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/produtos/${item.productSlug}`}
                    className="font-display text-lg leading-snug text-primary hover:underline"
                  >
                    {item.productName}
                  </Link>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatBRL(item.priceCents * item.quantity)}
                  </span>
                </div>
                <span className="text-base text-muted-foreground">{item.variantLabel}</span>

                {/* Detalhe: conteudo do conjunto OU dimensoes do item */}
                {detail?.isSet && detail.setItems.length > 0 ? (
                  <div className="mt-0.5 text-sm text-muted-foreground">
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
                  <span className="text-sm text-muted-foreground">{detail.dims}</span>
                ) : null}

                <span className="mt-1 text-base tabular-nums">
                  {formatBRL(item.priceCents)}
                  {item.quantity > 1 ? <span className="text-muted-foreground"> cada</span> : null}
                </span>

                <div className="mt-2 flex items-center justify-between gap-4 sm:justify-start">
                  <div className="flex items-center rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Diminuir quantidade de ${item.productName}`}
                      className="flex size-10 items-center justify-center rounded-l-lg text-primary transition-colors hover:bg-secondary active:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-9 text-center tabular-nums" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      aria-label={`Aumentar quantidade de ${item.productName}`}
                      className="flex size-10 items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-secondary active:bg-secondary"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="flex min-h-10 items-center gap-1.5 px-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Remover
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Resumo */}
      <aside className="w-full shrink-0 rounded-xl border bg-card p-5 sm:p-6 lg:sticky lg:top-24 lg:w-80">
        <h2 className="font-display text-xl text-primary">Resumo</h2>
        <div className="mt-4 flex justify-between text-base">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium tabular-nums">{formatBRL(total)}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          O frete é calculado no checkout, conforme o CEP.
        </p>

        <Button asChild size="lg" className="mt-6 w-full text-base">
          <Link href="/checkout">Finalizar compra</Link>
        </Button>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Você precisa estar logado para concluir.
        </p>

        <button
          type="button"
          onClick={clear}
          className="mt-3 min-h-10 w-full text-center text-sm text-muted-foreground hover:text-destructive"
        >
          Limpar carrinho
        </button>
      </aside>
    </div>
  );
}
