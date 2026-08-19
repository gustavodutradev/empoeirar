import { createClient } from "@/lib/supabase/server";

/**
 * Camada de leitura do catalogo. Usa o client de servidor (chave anon), entao
 * TODA query respeita a RLS: o publico so enxerga produtos `published`. Nao ha
 * `where status = 'published'` por seguranca no cliente — quem garante isso e a
 * policy no banco; o filtro aqui e so por clareza/consistencia.
 */

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_custom_funnel: boolean;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  status: string;
  stock: number;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  curvature: string | null;
  material_care: string | null;
};

export type ProductWithCategory = Product & {
  category: { name: string; slug: string } | null;
};

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category")
    .select("id, name, slug, description, sort_order, is_custom_funnel")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getProducts(categorySlug?: string): Promise<ProductWithCategory[]> {
  const supabase = await createClient();

  // Se ha filtro, resolve o id da categoria pelo slug (mais robusto do que
  // filtrar por recurso aninhado). Categoria inexistente => lista vazia.
  let categoryId: string | undefined;
  if (categorySlug) {
    const { data: cat, error: catError } = await supabase
      .from("category")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (catError) throw catError;
    if (!cat) return [];
    categoryId = (cat as { id: string }).id;
  }

  const base = supabase
    .from("product")
    .select("*, category:category_id(name, slug)")
    .eq("status", "published");

  const { data, error } = categoryId
    ? await base.eq("category_id", categoryId).order("name")
    : await base.order("name");

  if (error) throw error;
  return (data ?? []) as unknown as ProductWithCategory[];
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select("*, category:category_id(name, slug)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ProductWithCategory | null) ?? null;
}
