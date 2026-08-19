import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validacao de variaveis de ambiente (t3-env + Zod).
 *
 * Fronteira de seguranca central deste arquivo:
 * - `server`: segredos. NUNCA vao para o cliente. Se voce tentar ler uma
 *   dessas em um Client Component, o t3-env LANCA um erro — o segredo nao
 *   chega a existir no bundle do browser.
 * - `client`: o que pode ir ao browser. Por regra do Next, exige o prefixo
 *   NEXT_PUBLIC_ (e o t3-env obriga isso no schema).
 *
 * A validacao roda no build (importado por next.config.ts). Consequencia:
 * env faltando ou invalido = build QUEBRA, em vez de virar `undefined`
 * silencioso que so estoura em producao.
 */
export const env = createEnv({
  server: {
    // Chave service_role do Supabase: ela BYPASSA a RLS (acesso total ao
    // banco). Por isso mora aqui, so no servidor. Nunca prefixar NEXT_PUBLIC_.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    // Chave anon/publishable: e protegida pela RLS, entao pode ir ao cliente.
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // URL canonica do site (SEO, links absolutos, metadata).
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  // Client vars precisam ser referenciadas estaticamente aqui para o Next
  // conseguir inlina-las no bundle no momento do build.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  // "VAR=" (string vazia) e tratada como ausente — pega .env preenchido pela
  // metade em vez de deixar passar uma string vazia como se fosse valida.
  emptyStringAsUndefined: true,
});
