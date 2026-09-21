import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Quem esta vendo a pagina (usuario + se e admin), memoizado POR REQUISICAO via
 * React `cache`. O header renderiza o estado de login duas vezes (desktop e menu
 * mobile); sem o cache seriam 2x getUser + 2x is_admin por request.
 *
 * `isAdmin` aqui serve SO para decidir se mostra o link "Admin" na UI. A
 * autorizacao de verdade continua no servidor (lib/admin/guard.ts + RLS/RPC).
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false } as const;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { user, isAdmin: isAdmin === true } as const;
});
