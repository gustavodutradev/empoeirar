import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/env";

/**
 * Cliente padrao do servidor: chave anon + cookies de sessao, entao toda query
 * roda com a identidade do usuario e sob RLS.
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
