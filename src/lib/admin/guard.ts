import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guarda das rotas /admin. Chamada NO TOPO de cada página/layout de admin.
 *
 * Duas checagens no servidor: logado (getUser) e admin (is_admin() no banco).
 * Não confiamos em esconder o link — a página em si barra o acesso. Mesmo que
 * alguém force a URL, a RLS ainda impede ler dado alheio; isto é a camada de UI.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar?next=/admin/pedidos");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }

  return { supabase, user };
}
