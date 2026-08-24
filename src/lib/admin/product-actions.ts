"use server";

import { productInputSchema } from "@/lib/admin/product-schema";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

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
