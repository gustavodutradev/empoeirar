import type { Metadata } from "next";
import Link from "next/link";
import { AdminProductForm } from "@/components/site/admin-product-form";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "Admin · Novo produto" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();

  const { data: categories } = await supabase
    .from("category")
    .select("id, name")
    .order("sort_order");

  return (
    <div>
      <Link href="/admin/produtos" className="text-sm text-muted-foreground hover:text-primary">
        ← Produtos
      </Link>
      <h1 className="mt-2 font-display text-3xl text-primary">Novo produto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Preencha os dados e ao menos uma variante. As fotos são adicionadas depois.
      </p>

      <div className="mt-6">
        <AdminProductForm categories={(categories ?? []) as { id: string; name: string }[]} />
      </div>
    </div>
  );
}
