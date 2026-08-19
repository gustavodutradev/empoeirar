import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

/**
 * Cliente Supabase para uso NO BROWSER (Client Components, "use client").
 *
 * Usa a chave anon (publishable), que e segura de expor porque toda leitura/
 * escrita continua sujeita a RLS no banco. Nunca use a service_role aqui.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
