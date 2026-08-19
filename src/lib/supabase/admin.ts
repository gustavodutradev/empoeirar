import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Cliente ADMIN com a chave service_role.
 *
 * ⚠️ Este cliente BYPASSA a RLS — ele tem acesso total ao banco. Use SOMENTE
 * em codigo de servidor confiavel que legitimamente precisa disso (ex.:
 * handlers de webhook, jobs internos), e NELE voce mesmo tem que checar a
 * autorizacao na mao, porque a rede de seguranca da RLS nao vai te proteger.
 *
 * O `import "server-only"` no topo faz o BUILD QUEBRAR se este modulo for
 * importado (mesmo que transitivamente) em qualquer bundle de cliente — e a
 * garantia de que a service_role nunca vaza pro browser.
 *
 * Ainda nao ha uso na Fase 1; o cliente entra em cena com os webhooks (Fase 2).
 */
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
