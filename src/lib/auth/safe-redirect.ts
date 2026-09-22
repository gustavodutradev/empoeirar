/**
 * Sanitiza o parametro `next` (para onde mandar o usuario apos o login).
 *
 * Por que isso existe: um `next` vindo da URL e input do usuario. Se a gente
 * redirecionasse pra ele cru, um atacante mandaria um link
 * `/entrar?next=https://site-falso.com` e, apos o login, jogaria a vitima num
 * phishing com a marca da Empoeirar (open redirect — CWE-601).
 *
 * Regra: so aceitamos caminhos internos. Em vez de tentar listar todos os
 * truques ("//host", "/\host", "/<TAB>/host"...), a gente PARSEIA o valor com o
 * mesmo parser de URL do browser (WHATWG) e confere se a origem continuou a
 * nossa. O parser remove TAB/CR/LF e trata "\" como "/", entao "/\t/evil.com"
 * vira "//evil.com" -> outro host -> fallback. Validar com o mesmo parser que
 * vai interpretar o valor elimina a diferenca entre "o que eu checo" e "o que
 * o browser faz".
 */
const BASE = "https://empoeirar.invalid";

export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next?.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;

  // Devolve a forma normalizada (sem caracteres de controle), nao a string crua.
  return `${url.pathname}${url.search}${url.hash}`;
}
