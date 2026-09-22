import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { env } from "@/env";

export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 3000;

/**
 * Healthcheck para o monitor de uptime (item 42). Responde 200 quando o site
 * E o banco estão de pé, e 503 quando o banco não responde. Site no ar com o
 * Supabase fora também é "fora do ar": ninguém consegue comprar.
 *
 * - Fora do middleware: não lê sessão nem cookies.
 * - Usa a chave anon (sujeita à RLS), não a service_role: um endpoint público
 *   não precisa de mais permissão do que um visitante.
 * - Consulta só o cabeçalho (`head: true`): não devolve linha nenhuma.
 * - A resposta não traz detalhe do erro; o motivo fica no log.
 */
export async function GET() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { error } = await supabase
      .from("product")
      .select("id", { head: true, count: "exact" })
      .limit(1)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[health] banco indisponível:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: "degraded" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
