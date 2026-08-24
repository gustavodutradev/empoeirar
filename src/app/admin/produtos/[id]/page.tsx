import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/site/admin-product-form";
import { requireAdmin } from "@/lib/admin/guard";

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

  const [{ data: variants }, { data: categories }] = await Promise.all([
    supabase
      .from("product_variant")
      .select("id, label, price_cents, weight_grams, length_mm, width_mm, height_mm, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    supabase.from("category").select("id, name").order("name"),
  ]);

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

      <div className="mt-6">
        <AdminProductForm
          product={product}
          variants={variants ?? []}
          categories={categories ?? []}
        />
      </div>
    </div>
  );
}
