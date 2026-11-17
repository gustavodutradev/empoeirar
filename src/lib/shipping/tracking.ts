/**
 * Código de rastreio: normalização e link para o Melhor Rastreio.
 * Funções puras, usadas no admin (gravar), na página do pedido e no e-mail.
 */

const TRACKING_RE = /^[A-Z0-9]{5,40}$/;

/**
 * Tira espaços, hífens e pontos e passa para maiúsculas:
 * "aa 123.456.789-br" -> "AA123456789BR". Devolve null se não sobrar um
 * código válido (5 a 40 letras/números). A mesma regra existe no banco.
 */
export function normalizeTrackingCode(input: string): string | null {
  const code = input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return TRACKING_RE.test(code) ? code : null;
}

/**
 * Link público do Melhor Rastreio. O código já foi validado (só A-Z/0-9), mas
 * passa por encodeURIComponent mesmo assim: nunca montar URL com texto cru.
 */
export function trackingUrl(code: string): string {
  return `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`;
}
