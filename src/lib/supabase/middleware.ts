import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * Monta os headers da request a serem repassados aos Server Components:
 * cookies atualizados (caso a sessao tenha sido renovada) + os headers
 * customizados que o middleware injetou (x-nonce e a CSP), sem os quais o
 * Next nao consegue aplicar o nonce aos scripts dele.
 */
function forwardHeaders(request: NextRequest, injected: Headers): Headers {
  const headers = new Headers(request.headers);
  const nonce = injected.get("x-nonce");
  const csp = injected.get("content-security-policy");
  if (nonce) headers.set("x-nonce", nonce);
  if (csp) headers.set("content-security-policy", csp);
  return headers;
}

/**
 * Renova a sessao do Supabase a cada request, no middleware do Next.
 *
 * Por que isso existe: tokens de acesso expiram. O middleware intercepta a
 * request, revalida/renova o token e reescreve os cookies (httpOnly/Secure/
 * SameSite) tanto na request quanto na response, pra que Server Components
 * downstream leiam uma sessao sempre fresca.
 *
 * `injectedHeaders` carrega o x-nonce e a CSP gerados no middleware; sao
 * preservados em toda NextResponse.next para chegarem intactos ao Next.
 */
export async function updateSession(request: NextRequest, injectedHeaders: Headers) {
  let supabaseResponse = NextResponse.next({
    request: { headers: forwardHeaders(request, injectedHeaders) },
  });

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
          supabaseResponse = NextResponse.next({
            request: { headers: forwardHeaders(request, injectedHeaders) },
          });
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

  return supabaseResponse;
}
