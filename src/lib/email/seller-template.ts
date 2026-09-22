import { formatBRL, formatDateTime } from "@/lib/format";

/**
 * E-mail de "nova venda" para o vendedor (item 12). Função pura: recebe os
 * dados prontos e devolve assunto + HTML, para poder ser testada.
 *
 * O que vai e o que NÃO vai no e-mail:
 * - Vai: itens, valores, modalidade de frete, nome e endereço de entrega,
 *   que é o necessário para separar e despachar.
 * - NÃO vai: CPF, telefone e e-mail do cliente. E-mail fica guardado para
 *   sempre numa caixa de entrada (e pode ser encaminhado); esses dados ficam
 *   só no admin, que exige login de administrador.
 */

export type SellerOrderEmailData = {
  id: string;
  shortId: string;
  createdAt: string;
  customerName: string;
  subtotalCents: number;
  shippingCents: number | null;
  shippingService: string | null;
  totalCents: number;
  address: {
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
    cep: string;
  };
  items: { name: string; variant: string; quantity: number; lineTotalCents: number }[];
  siteUrl: string;
  /** Fora de produção (Preview, local): marca o e-mail como teste. */
  testMode: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INK = "#3a2f27";
const MUTED = "#8a7d70";
const ACCENT = "#7a5c39";
const BORDER = "#e7e1d8";

export function buildSellerOrderEmail(data: SellerOrderEmailData): {
  subject: string;
  html: string;
} {
  const prefix = data.testMode ? "[TESTE] " : "";
  const subject = `${prefix}Nova venda! Pedido nº ${data.shortId} — ${formatBRL(data.totalCents)}`;
  const adminUrl = `${data.siteUrl}/admin/pedidos/${encodeURIComponent(data.id)}`;
  const a = data.address;

  const items = data.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid ${BORDER}">` +
        `<strong>${i.quantity}×</strong> ${escapeHtml(i.name)}` +
        `<span style="display:block;color:${MUTED};font-size:12px">${escapeHtml(i.variant)}</span></td>` +
        `<td style="padding:6px 0;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap">${formatBRL(i.lineTotalCents)}</td></tr>`,
    )
    .join("");

  const shipping =
    data.shippingCents === null
      ? "a calcular"
      : `${formatBRL(data.shippingCents)}${data.shippingService ? ` (${escapeHtml(data.shippingService)})` : ""}`;

  const testBanner = data.testMode
    ? `<p style="margin:0 0 16px;padding:8px 12px;background:#fff4d6;border:1px solid #e8c766;border-radius:6px;font-size:13px">` +
      `Pedido de <strong>teste</strong> (ambiente fora de produção). Não despachar.</p>`
    : "";

  const html =
    `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#f6f4ef">` +
    `<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid ${BORDER};border-radius:12px;padding:28px;font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:14px">` +
    testBanner +
    `<h1 style="margin:0 0 4px;font-family:Georgia,serif;font-weight:normal;font-size:24px">Nova venda!</h1>` +
    `<p style="margin:0 0 20px;color:${MUTED}">Pedido <strong style="color:${INK}">nº ${escapeHtml(data.shortId)}</strong> · feito em ${escapeHtml(formatDateTime(data.createdAt))} · pagamento confirmado</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}` +
    `<tr><td style="padding:6px 0;color:${MUTED}">Subtotal</td><td style="text-align:right">${formatBRL(data.subtotalCents)}</td></tr>` +
    `<tr><td style="padding:6px 0;color:${MUTED}">Frete</td><td style="text-align:right">${shipping}</td></tr>` +
    `<tr><td style="padding:8px 0 0;font-weight:bold;border-top:2px solid ${BORDER}">Total</td>` +
    `<td style="padding:8px 0 0;font-weight:bold;text-align:right;border-top:2px solid ${BORDER}">${formatBRL(data.totalCents)}</td></tr></table>` +
    `<p style="margin:24px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Enviar para</p>` +
    `<p style="margin:0;line-height:1.5">${escapeHtml(data.customerName)}<br>` +
    `${escapeHtml(a.street)}, ${escapeHtml(a.number)}${a.complement ? ` — ${escapeHtml(a.complement)}` : ""}<br>` +
    `${escapeHtml(a.district)} · ${escapeHtml(a.city)}/${escapeHtml(a.state)}<br>CEP ${escapeHtml(a.cep)}</p>` +
    `<p style="margin:24px 0 0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px">Abrir pedido no admin</a></p>` +
    `<p style="margin:12px 0 0;color:${MUTED};font-size:12px">CPF e telefone do cliente estão no admin (é preciso estar logado).</p>` +
    `</div></body></html>`;

  return { subject, html };
}
