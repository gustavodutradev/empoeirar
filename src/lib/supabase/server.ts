import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/env";

/**
 * Cliente Supabase para uso NO SERVIDOR (Server Components, Route Handlers,
 * Server Actions).
 *
 * Usa a chave anon + os cookies de sessao do usuario. Consequencia central:
 * toda query feita por este cliente carrega a identidade do usuario, entao a
 * RLS do Postgres e aplicada automaticamente — o banco te protege de IDOR/BOLA
 * na origem. Este e o cliente padrao pra 99% do codigo de servidor.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` foi chamado de um Server Component (onde nao se pode
          // escrever cookie). Pode ser ignorado com seguranca: o middleware
          // (updateSession) e quem de fato renova a sessao a cada request.
        }
      },
    },
  });
}
