"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { productCreateSchema, productInputSchema } from "@/lib/admin/product-schema";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** Gera um slug seguro: sem acento, minúsculo, só [a-z0-9-]. */
function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "produto"
  );
}

/** Slug único: se o base já existe, tenta base-2, base-3… (constraint é o backstop). */
async function uniqueSlug(supabase: SupabaseClient, base: string): Promise<string> {
  const root = slugify(base);
  const { data } = await supabase.from("product").select("slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/**
 * Salva as edições de um produto (campos + variantes). Fronteira:
 *  1. getUser + is_admin() no banco (nunca confia na UI).
 *  2. Zod revalida tudo.
 *  3. Escreve sob RLS (policy product_write_admin / product_variant_write_admin).
 *
 * Reconciliação de variantes no v1: atualiza as existentes (com id) e insere as
 * novas (sem id). Não apaga nem mexe em is_default (evita o índice único de
 * default e as referências de pedido) — isso fica para o v2.
 */
export async function saveProduct(input: unknown): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const p = parsed.data;

  const { error: productError } = await supabase
    .from("product")
    .update({
      name: p.name,
      description: p.description,
      material_care: p.material_care,
      status: p.status,
      category_id: p.category_id,
    })
    .eq("id", p.id);

  if (productError) {
    console.error("[saveProduct] product", productError.message);
    return { ok: false, error: "Não foi possível salvar o produto." };
  }

  for (const v of p.variants) {
    const fields = {
      label: v.label,
      price_cents: v.price_cents,
      weight_grams: v.weight_grams,
      length_mm: v.length_mm,
      width_mm: v.width_mm,
      height_mm: v.height_mm,
      sort_order: v.sort_order,
    };

    const { error: variantError } = v.id
      ? await supabase.from("product_variant").update(fields).eq("id", v.id)
      : await supabase
          .from("product_variant")
          .insert({ ...fields, product_id: p.id, is_default: false });

    if (variantError) {
      console.error("[saveProduct] variant", variantError.message);
      return {
        ok: false,
        error: "Produto salvo, mas uma variante falhou. Revise e salve de novo.",
      };
    }
  }

  return { ok: true };
}

type CreateResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Cria um produto com suas variantes (atômico, via RPC create_product).
 * Fronteira: getUser + is_admin() (a RPC também revalida is_admin no banco).
 * A primeira variante vira a default. Slug gerado do nome se não informado.
 */
export async function createProduct(input: unknown): Promise<CreateResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const p = parsed.data;

  const slug = await uniqueSlug(supabase, p.slug?.trim() || p.name);

  const { data, error } = await supabase.rpc("create_product", {
    p_name: p.name,
    p_slug: slug,
    p_description: p.description,
    p_material_care: p.material_care,
    p_status: p.status,
    p_category_id: p.category_id,
    p_variants: p.variants.map((v, i) => ({
      label: v.label,
      price_cents: v.price_cents,
      weight_grams: v.weight_grams,
      length_mm: v.length_mm,
      width_mm: v.width_mm,
      height_mm: v.height_mm,
      sort_order: i,
    })),
  });

  if (error || typeof data !== "string") {
    console.error("[createProduct]", error?.message ?? "retorno inesperado");
    return {
      ok: false,
      error: "Não foi possível criar o produto. Verifique o slug e tente de novo.",
    };
  }

  return { ok: true, id: data };
}

/**
 * Remove uma variante PERSISTIDA (edição). Proteções:
 *  - não deixa o produto sem variante (mínimo 1);
 *  - se era a default, promove a próxima (por sort_order) a default;
 *  - a FK order_item.variant_id é `on delete restrict`: se a variante já está em
 *    algum pedido, o delete falha e devolvemos um erro amigável (não se apaga
 *    histórico de pedido).
 */
export async function deleteVariant(variantId: string): Promise<Result> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Sem permissão." };

  const { data: v } = await supabase
    .from("product_variant")
    .select("id, product_id, is_default")
    .eq("id", variantId)
    .maybeSingle();
  if (!v) return { ok: false, error: "Variante não encontrada." };

  const { count } = await supabase
    .from("product_variant")
    .select("id", { count: "exact", head: true })
    .eq("product_id", v.product_id);
  if ((count ?? 0) <= 1) {
    return { ok: false, error: "O produto precisa de ao menos uma variante." };
  }

  const { error: delErr } = await supabase.from("product_variant").delete().eq("id", variantId);
  if (delErr) {
    console.error("[deleteVariant]", delErr.message);
    return { ok: false, error: "Não é possível remover: essa variante já está em pedidos." };
  }

  if (v.is_default) {
    const { data: next } = await supabase
      .from("product_variant")
      .select("id")
      .eq("product_id", v.product_id)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("product_variant").update({ is_default: true }).eq("id", next.id);
    }
  }

  return { ok: true };
}
