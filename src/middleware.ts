import type { NextRequest } from "next/server";
import { env } from "@/env";
import { buildContentSecurityPolicy, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1) Gera o nonce e monta a CSP deste request.
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    isDev: process.env.NODE_ENV !== "production",
  });

  // 2) Injeta x-nonce + CSP nos headers repassados ao app. O Next le a CSP
  //    (que contem o nonce) para aplicar o nonce aos scripts que ele gera.
  const injectedHeaders = new Headers(request.headers);
  injectedHeaders.set("x-nonce", nonce);
  injectedHeaders.set("content-security-policy", csp);

  // 3) Renova a sessao do Supabase carregando esses headers.
  const response = await updateSession(request, injectedHeaders);

  // 4) Aplica a CSP na response (e ela que o browser efetivamente aplica).
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, EXCETO:
     * - api/health (healthcheck deve ser leve, sem chamada de sessao)
     * - _next/static, _next/image (bundles e imagens otimizadas)
     * - favicon.ico e arquivos de imagem estaticos
     */
    "/((?!api/health|api/webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
