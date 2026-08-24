import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Estado de login no header. Server Component: le a sessao via getUser() (que
 * valida o token no servidor do Supabase, ao contrario de getSession que so le
 * o cookie). Logado -> mostra "Minha conta" + "Sair"; deslogado -> "Entrar".
 *
 * O "Sair" e um <form> POST para /auth/signout (logout via POST evita CSRF de
 * logout — ver a rota).
 */
export async function AuthNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/entrar" className="text-foreground/80 transition-colors hover:text-primary">
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/conta" className="text-foreground/80 transition-colors hover:text-primary">
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
