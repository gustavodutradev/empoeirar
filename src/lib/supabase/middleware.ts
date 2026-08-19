import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Renova a sessao do Supabase a cada request, no middleware do Next.
 *
 * Por que isso existe: tokens de acesso expiram. O middleware intercepta a
 * request, revalida/renova o token e reescreve os cookies (httpOnly/Secure/
 * SameSite) tanto na request quanto na response, pra que Server Components
 * downstream leiam uma sessao sempre fresca.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANTE: nao insira logica entre createServerClient e getUser().
  // getUser() REVALIDA o token contra o servidor de Auth do Supabase — ao
  // contrario de getSession(), que apenas le o cookie sem verificar e por isso
  // NUNCA deve ser a base de uma decisao de autorizacao no servidor.
  await supabase.auth.getUser();

  // (Fase 1/2) Aqui entrara a protecao de rotas: se nao houver usuario e a
  // rota for protegida (checkout/admin), redirecionar para /login. Deixado
  // para quando essas rotas existirem, pra nao redirecionar no vazio.

  // IMPORTANTE: retorne o supabaseResponse como esta. Se for criar uma outra
  // NextResponse, copie os cookies dele (supabaseResponse.cookies) para nao
  // dessincronizar a sessao do browser.
  return supabaseResponse;
}
