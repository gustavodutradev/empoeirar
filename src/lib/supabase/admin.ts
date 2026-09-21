import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Cliente com a chave service_role: ignora a RLS. Quem usa precisa checar a
 * autorizacao por conta propria. `server-only` quebra o build se o modulo
 * chegar a um bundle de cliente.
 */
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
