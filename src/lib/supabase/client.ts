import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/env";

/**
 * Cliente do navegador. Usa so a chave anon; tudo passa pela RLS.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
