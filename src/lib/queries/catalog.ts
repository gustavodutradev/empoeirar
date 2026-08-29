import { createClient } from "@/lib/supabase/server";

/**
 * Camada de leitura do catalogo. Usa o client de servidor (chave anon), entao
 * TODA query respeita a RLS: o publico so enxerga produtos `published` e as
 * variantes deles.
 */

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_custom_funnel: boolean;
};

export type ProductVariant = {
  id: string;
  label: string;
  price_cents: number;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  is_default: boolean;
  sort_order: number;
};

export type ProductWithVariants = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  stock: number;
  curvature: string | null;
  material_care: string | null;
  category: { name: string; slug: string } | null;
  variants: ProductVariant[];
};

/** Item enxuto para cards/listagem: preco "a partir de" e se ha opcoes. */
export type ProductListItem = {
  name: string;
  slug: string;
  priceFromCents: number;
  hasOptions: boolean;
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

/**
 * Slugs dos produtos publicados de cada categoria (ordenados por nome), para
 * ilustrar os cards da home. Retorna { categorySlug: [productSlug, ...] } — quem
 * chama escolhe o primeiro que TENHA foto (nem todo produto tem imagem no
 * bridge atual). Respeita a RLS (só produtos publicados).
 */
export async function getCategoryPreviews(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select("slug, category:category_id(slug)")
    .eq("status", "published")
    .order("name");
  if (error) throw error;

  const rows = (data ?? []) as unknown as { slug: string; category: { slug: string } | null }[];
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    const cat = row.category?.slug;
    if (!cat) continue;
    if (!out[cat]) out[cat] = [];
    out[cat].push(row.slug);
  }
  return out;
}

type ListRow = { name: string; slug: string; variants: { price_cents: number }[] };

export async function getProducts(categorySlug?: string): Promise<ProductListItem[]> {
  const supabase = await createClient();

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
    .select("name, slug, variants:product_variant(price_cents)")
    .eq("status", "published");

  const { data, error } = categoryId
    ? await base.eq("category_id", categoryId).order("name")
    : await base.order("name");
  if (error) throw error;

  const rows = (data ?? []) as unknown as ListRow[];
  return rows
    .filter((r) => r.variants.length > 0)
    .map((r) => ({
      name: r.name,
      slug: r.slug,
      priceFromCents: Math.min(...r.variants.map((v) => v.price_cents)),
      hasOptions: r.variants.length > 1,
    }));
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select("*, category:category_id(name, slug), variants:product_variant(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const product = data as unknown as ProductWithVariants;
  // Ordena as variantes (o embed nao garante ordem).
  product.variants = [...product.variants].sort((a, b) => a.sort_order - b.sort_order);
  return product;
}
