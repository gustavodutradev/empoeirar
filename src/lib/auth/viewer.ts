import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuario atual e se e admin, memoizado por requisicao (o header chama duas
 * vezes). `isAdmin` so controla a UI; a autorizacao fica em guard.ts e na RLS.
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
