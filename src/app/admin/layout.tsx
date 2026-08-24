import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center gap-6 border-b pb-4">
        <span className="font-display text-xl text-primary">Admin</span>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/admin/pedidos"
            className="text-foreground/80 transition-colors hover:text-primary"
          >
            Pedidos
          </Link>
          <Link
            href="/admin/produtos"
            className="text-foreground/80 transition-colors hover:text-primary"
          >
            Produtos
          </Link>
        </nav>
        <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-primary">
          ← Voltar ao site
        </Link>
      </div>
      {children}
    </div>
  );
}
