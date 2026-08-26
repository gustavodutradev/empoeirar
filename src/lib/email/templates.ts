import { formatBRL } from "@/lib/format";

/**
 * Templates dos e-mails transacionais de pedido. HTML compatível com clientes
 * de e-mail: layout em tabela, estilos inline, fontes web-safe.
 *
 * SEGURANÇA: todo valor dinâmico passa por escapeHtml. Nome do cliente e
 * endereço vêm de input do usuário; sem escape, um "<" no nome quebraria o
 * layout ou permitiria injeção de HTML no e-mail.
 */

export type OrderEmailStatus = "pending_payment" | "paid" | "shipped" | "delivered";

export type OrderEmailData = {
  id: string;
  shortId: string;
  customerName: string;
  subtotalCents: number;
  shippingCents: number | null;
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
};

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<
          string,
          string
        >
      )[c] ?? c,
  );
}

const CONTENT: Record<
  OrderEmailStatus,
  { subject: (shortId: string) => string; headline: string; message: string; payNote?: boolean }
> = {
  pending_payment: {
    subject: (s) => `Pedido nº ${s} recebido — aguardando pagamento`,
    headline: "Recebemos seu pedido!",
    message:
      "Seu pedido foi registrado e está aguardando o pagamento. Assim que ele for confirmado, avisamos você por aqui.",
    payNote: true,
  },
  paid: {
    subject: (s) => `Pagamento confirmado — pedido nº ${s}`,
    headline: "Pagamento confirmado!",
    message:
      "Recebemos seu pagamento e já vamos preparar seu pedido com todo o cuidado. Você acompanha cada etapa pelo link abaixo.",
  },
  shipped: {
    subject: (s) => `Seu pedido nº ${s} foi enviado`,
    headline: "Seu pedido está a caminho!",
    message: "Boa notícia: seu pedido foi enviado e logo chega até você.",
  },
  delivered: {
    subject: (s) => `Pedido nº ${s} entregue`,
    headline: "Pedido entregue!",
    message:
      "Seu pedido foi entregue. Esperamos que você goste — obrigado por prestigiar o trabalho artesanal da Empoeirar!",
  },
};

// Paleta terrosa, alinhada com a marca.
const BG = "#f6f4ef";
const CARD = "#ffffff";
const INK = "#3a2f27";
const MUTED = "#8a7d70";
const ACCENT = "#7a5c39";
const BORDER = "#e7e1d8";

function itemsRows(items: OrderEmailData["items"]): string {
  if (items.length === 0) return "";
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};color:${INK};font-size:14px;">
          ${i.quantity}× ${escapeHtml(i.name)}
          <span style="display:block;color:${MUTED};font-size:12px;">${escapeHtml(i.variant)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid ${BORDER};color:${INK};font-size:14px;text-align:right;white-space:nowrap;">
          ${formatBRL(i.lineTotalCents)}
        </td>
      </tr>`,
    )
    .join("");
}

function totalsRows(data: OrderEmailData): string {
  const frete = data.shippingCents === null ? "a calcular" : formatBRL(data.shippingCents ?? 0);
  return `
    <tr>
      <td style="padding:6px 0;color:${MUTED};font-size:14px;">Subtotal</td>
      <td style="padding:6px 0;color:${INK};font-size:14px;text-align:right;">${formatBRL(data.subtotalCents)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:${MUTED};font-size:14px;">Frete</td>
      <td style="padding:6px 0;color:${INK};font-size:14px;text-align:right;">${frete}</td>
    </tr>
    <tr>
      <td style="padding:10px 0 0;color:${INK};font-size:16px;font-weight:bold;border-top:2px solid ${BORDER};">Total</td>
      <td style="padding:10px 0 0;color:${INK};font-size:16px;font-weight:bold;text-align:right;border-top:2px solid ${BORDER};">${formatBRL(data.totalCents)}</td>
    </tr>`;
}

export function buildOrderEmail(
  status: OrderEmailStatus,
  data: OrderEmailData,
): { subject: string; html: string } {
  const c = CONTENT[status];
  const orderUrl = `${data.siteUrl}/pedido/${data.id}`;
  const addr = data.address;

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <!-- Cabeçalho -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${ACCENT};letter-spacing:0.5px;">Empoeirar</span>
        </td></tr>

        <!-- Título + mensagem -->
        <tr><td style="padding:32px 32px 8px;">
          <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${INK};font-weight:normal;">${escapeHtml(c.headline)}</h1>
          <p style="margin:0;color:${MUTED};font-size:15px;line-height:1.5;">
            Olá${data.customerName ? `, ${escapeHtml(data.customerName.split(" ")[0] ?? "")}` : ""}. ${escapeHtml(c.message)}
          </p>
          <p style="margin:12px 0 0;color:${MUTED};font-size:14px;">Pedido <strong style="color:${INK};">nº ${escapeHtml(data.shortId)}</strong></p>
        </td></tr>

        <!-- Botão -->
        <tr><td style="padding:20px 32px 8px;">
          <a href="${orderUrl}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:15px;padding:12px 24px;border-radius:8px;">Acompanhar pedido</a>
          ${c.payNote ? `<p style="margin:12px 0 0;color:${MUTED};font-size:13px;">Você também pode concluir o pagamento por esse link.</p>` : ""}
        </td></tr>

        <!-- Itens -->
        <tr><td style="padding:24px 32px 8px;">
          <p style="margin:0 0 8px;color:${INK};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Itens</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${itemsRows(data.items)}
            ${totalsRows(data)}
          </table>
        </td></tr>

        <!-- Endereço -->
        <tr><td style="padding:16px 32px 8px;">
          <p style="margin:0 0 8px;color:${INK};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Entrega</p>
          <p style="margin:0;color:${MUTED};font-size:14px;line-height:1.5;">
            ${escapeHtml(addr.street)}, ${escapeHtml(addr.number)}${addr.complement ? ` — ${escapeHtml(addr.complement)}` : ""}<br>
            ${escapeHtml(addr.district)} · ${escapeHtml(addr.city)}/${escapeHtml(addr.state)}<br>
            CEP ${escapeHtml(addr.cep)}
          </p>
        </td></tr>

        <!-- Rodapé -->
        <tr><td style="padding:24px 32px 32px;border-top:1px solid ${BORDER};margin-top:16px;">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.5;">
            Empoeirar — marcenaria artesanal.<br>
            Este é um e-mail automático de confirmação do seu pedido.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: c.subject(data.shortId), html };
}
