/**
 * Sanitiza o parametro `next` (para onde mandar o usuario apos o login).
 *
 * Por que isso existe: um `next` vindo da URL e input do usuario. Se a gente
 * redirecionasse pra ele cru, um atacante mandaria um link
 * `/entrar?next=https://site-falso.com` e, apos o login, jogaria a vitima num
 * phishing com a marca da Empoeirar (open redirect — CWE-601).
 *
 * Regra: so aceitamos caminhos internos. Precisa comecar com uma unica "/" e
 * NAO com "//" nem "/\" (que o browser trata como URL protocol-relative para
 * outro host). Qualquer coisa fora disso vira o fallback "/".
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
