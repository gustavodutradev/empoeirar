import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registra um acesso e diz se está DENTRO do limite (janela fixa no banco,
 * função rate_limit_hit).
 *
 * Fail-open: se o próprio limiter falhar (ex.: banco indisponível), PERMITE — a
 * disponibilidade da loja vale mais que a rigidez do limite. Rate limit é
 * defesa contra abuso/flood, não a porta de segurança principal (essa é a RLS +
 * validações no servidor).
 */
export async function allowRequest(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

/** IP do cliente a partir dos headers (no Vercel, x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
