import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductImages, productImageUrl } from "@/lib/product-images";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de leitura do catalogo. Usa o client de servidor (chave anon), entao
 * TODA query respeita a RLS: o publico so enxerga produtos `published` e as
 * variantes deles.
 */

/**
 * URLs de foto por produto: do product_image (Storage) quando houver; senão cai
 * no mapa fixo (bridge) por slug. Uma query batelada (.in) para vários produtos.
 * Assim a migração para o Storage é gradual — produtos sem foto no banco seguem
 * usando o bridge.
 */
async function imagesByProduct(
  supabase: SupabaseClient,
  products: { id: string; slug: string }[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (products.length === 0) return result;

  const { data } = await supabase
    .from("product_image")
    .select("product_id, storage_path, is_primary, sort_order")
    .in(
      "product_id",
      products.map((p) => p.id),
    )
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });

  const db = new Map<string, string[]>();
  for (const r of (data ?? []) as { product_id: string; storage_path: string }[]) {
    const arr = db.get(r.product_id) ?? [];
    arr.push(productImageUrl(r.storage_path));
    db.set(r.product_id, arr);
  }

  for (const p of products) {
    const fromDb = db.get(p.id);
    result.set(p.id, fromDb && fromDb.length > 0 ? fromDb : getProductImages(p.slug));
  }
  return result;
}

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
  images: string[];
};

/** Item enxuto para cards/listagem: preco "a partir de" e se ha opcoes. */
export type ProductListItem = {
  name: string;
  slug: string;
  priceFromCents: number;
  hasOptions: boolean;
  image?: string;
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
 * Foto de capa por categoria (a 1ª foto do primeiro produto publicado da
 * categoria que TENHA imagem, do banco ou do bridge). Retorna
 * { categorySlug: imageUrl }. Respeita a RLS (só produtos publicados).
 */
export async function getCategoryPreviews(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product")
    .select("id, slug, category:category_id(slug)")
    .eq("status", "published")
    .order("name");
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    slug: string;
    category: { slug: string } | null;
  }[];

  const byCat = new Map<string, { id: string; slug: string }[]>();
  for (const row of rows) {
    const cat = row.category?.slug;
    if (!cat) continue;
    const list = byCat.get(cat) ?? [];
    list.push({ id: row.id, slug: row.slug });
    byCat.set(cat, list);
  }

  const imgs = await imagesByProduct(
    supabase,
    rows.map((r) => ({ id: r.id, slug: r.slug })),
  );

  const out: Record<string, string> = {};
  for (const [cat, prods] of byCat) {
    for (const p of prods) {
      const url = imgs.get(p.id)?.[0];
      if (url) {
        out[cat] = url;
        break;
      }
    }
  }
  return out;
}

type ListRow = { id: string; name: string; slug: string; variants: { price_cents: number }[] };

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
    .select("id, name, slug, variants:product_variant(price_cents)")
    .eq("status", "published");

  const { data, error } = categoryId
    ? await base.eq("category_id", categoryId).order("name")
    : await base.order("name");
  if (error) throw error;

  const rows = (data ?? []) as unknown as ListRow[];
  const valid = rows.filter((r) => r.variants.length > 0);
  const imgs = await imagesByProduct(
    supabase,
    valid.map((r) => ({ id: r.id, slug: r.slug })),
  );

  return valid.map((r) => ({
    name: r.name,
    slug: r.slug,
    priceFromCents: Math.min(...r.variants.map((v) => v.price_cents)),
    hasOptions: r.variants.length > 1,
    image: imgs.get(r.id)?.[0],
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

  const imgs = await imagesByProduct(supabase, [{ id: product.id, slug: product.slug }]);
  product.images = imgs.get(product.id) ?? [];
  return product;
}
