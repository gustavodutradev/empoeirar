import type { SupabaseClient } from "@supabase/supabase-js";
import type { CartItem } from "@/lib/cart/store";
import { sizeLabel } from "@/lib/format";
import { getProductImages } from "@/lib/product-images";

/**
 * Sincronização do carrinho com o banco (usuário logado). O banco guarda só
 * {variant_id, quantity}; aqui re-hidratamos os campos de exibição (nome, preço,
 * imagem) a partir do catálogo — o preço é sempre relido, nunca confiado do
 * localStorage.
 */

type Row = { variant_id: string; quantity: number };
type Var = { id: string; label: string; price_cents: number; product_id: string };
type Prod = { id: string; name: string; slug: string };

/** Lê o carrinho do usuário do banco e monta CartItems prontos para o store. */
export async function fetchServerCart(supabase: SupabaseClient): Promise<CartItem[]> {
  const { data: rows } = await supabase.from("cart_item").select("variant_id, quantity");
  const cartRows = (rows ?? []) as Row[];
  if (cartRows.length === 0) return [];

  const variantIds = cartRows.map((r) => r.variant_id);
  const { data: varsData } = await supabase
    .from("product_variant")
    .select("id, label, price_cents, product_id")
    .in("id", variantIds);
  const vars = (varsData ?? []) as Var[];

  const productIds = [...new Set(vars.map((v) => v.product_id))];
  const { data: prodsData } = await supabase
    .from("product")
    .select("id, name, slug")
    .in("id", productIds);
  const prods = (prodsData ?? []) as Prod[];

  const varById = new Map(vars.map((v) => [v.id, v]));
  const prodById = new Map(prods.map((p) => [p.id, p]));

  const out: CartItem[] = [];
  for (const r of cartRows) {
    const v = varById.get(r.variant_id);
    const p = v && prodById.get(v.product_id);
    if (!v || !p) continue;
    out.push({
      variantId: r.variant_id,
      quantity: r.quantity,
      priceCents: v.price_cents,
      variantLabel: sizeLabel(v.label),
      productName: p.name,
      productSlug: p.slug,
      image: getProductImages(p.slug)[0],
    });
  }
  return out;
}

/**
 * Funde carrinho de CONVIDADO com o do servidor: SOMA quantidades.
 * Use SÓ na transição convidado→login (fusão única do carrinho anônimo).
 * Somar em todo reload de um usuário já logado DUPLICA o carrinho.
 */
export function mergeCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const s of server) map.set(s.variantId, { ...s });
  for (const l of local) {
    const existing = map.get(l.variantId);
    if (existing) existing.quantity = Math.min(99, existing.quantity + l.quantity);
    else map.set(l.variantId, { ...l });
  }
  return [...map.values()];
}

/**
 * União para o MESMO dono recarregando a página: NÃO soma. Para um item que
 * existe nos dois lados, mantém a quantidade do LOCAL (é a ação mais recente do
 * usuário; o banco pode estar atrás por causa do debounce). Mantém também os
 * itens que só existem em um lado — assim não se perde item na corrida do
 * debounce (local-only) nem alteração feita em outro dispositivo (server-only).
 */
export function unionCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const s of server) map.set(s.variantId, { ...s });
  for (const l of local) map.set(l.variantId, { ...l }); // local vence a quantidade; não soma
  return [...map.values()];
}

/** Grava o estado atual do carrinho no banco (upsert dos itens + apaga removidos). */
export async function reconcileServerCart(
  supabase: SupabaseClient,
  userId: string,
  items: CartItem[],
): Promise<void> {
  if (items.length === 0) {
    // RLS restringe ao próprio usuário; o filtro é só a exigência do PostgREST.
    await supabase.from("cart_item").delete().not("variant_id", "is", null);
    return;
  }

  await supabase.from("cart_item").upsert(
    items.map((i) => ({ user_id: userId, variant_id: i.variantId, quantity: i.quantity })),
    { onConflict: "user_id,variant_id" },
  );

  const ids = items.map((i) => i.variantId);
  await supabase
    .from("cart_item")
    .delete()
    .not("variant_id", "in", `(${ids.join(",")})`);
}
