/**
 * Partes PURAS do monitoramento (sem env, sem rede): extrair dados do erro,
 * calcular a "impressão digital" para agrupar repetições e montar o e-mail.
 * O envio e o controle de volume ficam em ./report.ts.
 */

export type AlertDetails = Record<string, string | number | null | undefined>;

export type AlertInput = {
  kind: "error" | "business";
  title: string;
  details: AlertDetails;
  stack?: string;
};

export type ErrorInfo = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
};

const MAX_MESSAGE = 500;
const MAX_STACK_LINES = 8;

/** Extrai o que interessa de um `unknown` lançado (Error, string, objeto...). */
export function errorInfo(err: unknown): ErrorInfo {
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest: unknown }).digest)
      : undefined;

  if (err instanceof Error) {
    return {
      name: err.name,
      message: truncate(err.message, MAX_MESSAGE),
      stack: err.stack?.split("\n").slice(0, MAX_STACK_LINES).join("\n"),
      digest,
    };
  }
  return { name: "NonError", message: truncate(String(err), MAX_MESSAGE), digest };
}

/**
 * Remove query string e fragmento do caminho. A query pode carregar dados do
 * usuário (e-mail, CEP, tokens de retorno), e nada disso deve ir para log ou
 * e-mail de alerta.
 */
export function stripQuery(path: string): string {
  return path.split(/[?#]/, 1)[0] ?? "";
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Tira da mensagem o que varia a cada ocorrência (UUIDs, números longos), para
 * que "pedido abc falhou" e "pedido def falhou" contem como O MESMO erro e
 * gerem um alerta só, não um por pedido.
 */
export function normalizeForFingerprint(value: string): string {
  return value
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d{4,}/g, "<n>")
    .trim();
}

/**
 * Hash curto e estável (FNV-1a 32 bits) para usar como chave de agrupamento.
 * Não é criptográfico e não precisa ser: só identifica "o mesmo erro".
 */
export function fingerprint(...parts: string[]): string {
  let hash = 0x811c9dc5;
  for (const char of parts.map(normalizeForFingerprint).join("|")) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const brDateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "America/Sao_Paulo",
});

/**
 * E-mail de alerta para o admin. Todo valor passa por escapeHtml: a mensagem
 * de erro pode conter texto controlado por quem fez a requisição.
 */
export function buildAlertEmail(alert: AlertInput, now: Date): { subject: string; html: string } {
  const prefix = alert.kind === "business" ? "Atenção" : "Erro";
  const subject = truncate(`[Empoeirar] ${prefix}: ${alert.title}`.replace(/[\r\n]+/g, " "), 150);

  const rows = Object.entries(alert.details)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(key)}</td>` +
        `<td style="padding:4px 0;font-family:monospace">${escapeHtml(String(value))}</td></tr>`,
    )
    .join("");

  const stack = alert.stack
    ? `<pre style="background:#f4f4f4;padding:12px;font-size:12px;white-space:pre-wrap">${escapeHtml(alert.stack)}</pre>`
    : "";

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">` +
    `<h2 style="margin:0 0 12px">${escapeHtml(alert.title)}</h2>` +
    `<p style="color:#666;margin:0 0 12px">${escapeHtml(brDateTime.format(now))} (horário de Brasília)</p>` +
    `<table style="border-collapse:collapse">${rows}</table>${stack}` +
    `<p style="color:#999;font-size:12px;margin-top:16px">Alertas iguais são agrupados: no máximo um por hora.</p>` +
    `</div>`;

  return { subject, html };
}
