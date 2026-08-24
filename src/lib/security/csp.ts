/**
 * Content-Security-Policy com nonce por request.
 *
 * A CSP e a principal defesa contra XSS: mesmo que um atacante injete um
 * <script>, o browser so executa scripts com o nonce daquele request (ou
 * carregados por um script que ja tem o nonce, via 'strict-dynamic'). Como o
 * nonce muda a cada request e nunca e previsivel, HTML injetado nao roda.
 *
 * `buildContentSecurityPolicy` e uma funcao pura (testavel); o middleware
 * injeta o nonce e a origem do Supabase.
 */

/** Nonce aleatorio (Web Crypto, disponivel no Edge runtime do middleware). */
export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function buildContentSecurityPolicy(opts: {
  nonce: string;
  supabaseUrl: string;
  isDev: boolean;
}): string {
  const { nonce, supabaseUrl, isDev } = opts;

  const supabaseOrigin = new URL(supabaseUrl).origin;
  // Realtime do Supabase usa WebSocket (ws/wss) na mesma origem.
  const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Deixa os scripts com nonce carregarem os chunks do Next; com strict-dynamic
    // o host-source 'self' e ignorado (proposital, e o recomendado pelo Next).
    "'strict-dynamic'",
    // Dev: o HMR do Turbopack usa eval. Em producao isso NAO entra.
    isDev ? "'unsafe-eval'" : "",
  ].filter(Boolean);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    // Estilo inline e baixo risco; next/font e o Tailwind injetam <style>.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", supabaseOrigin],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabaseOrigin, supabaseWs],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Anti-clickjacking: ninguem pode nos colocar em um <iframe>.
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(([key, values]) => `${key} ${values.join(" ")}`);
  // Em producao, forca upgrade de http->https em qualquer subrecurso.
  if (!isDev) parts.push("upgrade-insecure-requests");

  return parts.join("; ");
}
