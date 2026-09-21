import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { cn } from "@/lib/utils";

/**
 * Estado de login no header. Server Component: le a sessao via getUser() (que
 * valida o token no servidor do Supabase, ao contrario de getSession que so le
 * o cookie). Logado -> "Minha conta" + "Sair"; deslogado -> "Entrar".
 *
 * `variant="mobile"` renderiza a versao em lista (alvos de toque grandes) usada
 * dentro do menu lateral. As duas variantes compartilham o mesmo getViewer()
 * memoizado, entao nao ha consulta duplicada.
 *
 * O "Sair" e um <form> POST para /auth/signout (logout via POST evita CSRF de
 * logout — ver a rota).
 */
export async function AuthNav({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { user, isAdmin } = await getViewer();

  if (variant === "mobile") {
    const item =
      "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-lg text-foreground/85 transition-colors hover:bg-secondary/60 hover:text-primary";
    if (!user) {
      return (
        <Link href="/entrar" className={item}>
          <User className="size-5" aria-hidden />
          Entrar / criar conta
        </Link>
      );
    }
    return (
      <div className="flex flex-col">
        <p className="truncate px-3 pb-1 text-sm text-muted-foreground">{user.email}</p>
        <Link href="/conta" className={item}>
          <User className="size-5" aria-hidden />
          Minha conta
        </Link>
        {isAdmin ? (
          <Link href="/admin/pedidos" className={item}>
            <Shield className="size-5" aria-hidden />
            Admin
          </Link>
        ) : null}
        <form action="/auth/signout" method="post">
          <button type="submit" className={cn(item, "text-foreground/70")}>
            <LogOut className="size-5" aria-hidden />
            Sair
          </button>
        </form>
      </div>
    );
  }

  const link = "text-foreground/80 transition-colors hover:text-primary";
  if (!user) {
    return (
      <Link href="/entrar" className={link}>
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {isAdmin ? (
        <Link href="/admin/pedidos" className={link}>
          Admin
        </Link>
      ) : null}
      <Link href="/conta" className={link}>
        Minha conta
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="text-foreground/60 transition-colors hover:text-primary">
          Sair
        </button>
      </form>
    </div>
  );
}
