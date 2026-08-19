import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, EXCETO os assets que nao precisam de sessao:
     * - _next/static, _next/image (bundles e imagens otimizadas)
     * - favicon.ico e arquivos de imagem estaticos
     * Assim evitamos custo de renovacao de sessao em request de asset.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
