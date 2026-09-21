import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Healthcheck simples para monitoramento de uptime. Nao toca no banco nem na
 * sessao (excluido do middleware), entao responde mesmo se o Supabase oscilar.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
