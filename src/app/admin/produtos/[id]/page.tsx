import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/site/admin-product-form";
import { AdminProductImages } from "@/components/site/admin-product-images";
import { requireAdmin } from "@/lib/admin/guard";
import { productImageUrl } from "@/lib/product-images";

export const metadata: Metadata = { title: "Admin · Editar produto" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminProductEdit({ params }: Params) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: product } = await supabase
    .from("product")
    .select("id, name, slug, description, material_care, status, category_id")
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: variants }, { data: categories }, { data: imageRows }] = await Promise.all([
    supabase
      .from("product_variant")
      .select("id, label, price_cents, weight_grams, length_mm, width_mm, height_mm, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    supabase.from("category").select("id, name").order("name"),
    supabase
      .from("product_image")
      .select("id, storage_path, is_primary, sort_order")
      .eq("product_id", id)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),
  ]);

  const images = (imageRows ?? []).map(
    (r: { id: string; storage_path: string; is_primary: boolean }) => ({
      id: r.id,
      url: productImageUrl(r.storage_path),
      isPrimary: r.is_primary,
    }),
  );

  return (
    <div>
      <Link href="/admin/produtos" className="text-sm text-muted-foreground hover:text-primary">
        ← Todos os produtos
      </Link>
      <h1 className="mt-4 font-display text-3xl text-primary">{product.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Slug: <span className="font-mono">{product.slug}</span> (não editável — as fotos dependem
        dele)
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <AdminProductImages productId={product.id} images={images} />
        <AdminProductForm
          product={product}
          variants={variants ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}
