import { describe, expect, it } from "vitest";
import { buildReturnNotice, parsePaymentId } from "./return-notice";

const open = { canPay: true };
const closed = { canPay: false };
const pay = (status: string, statusDetail: string | null = null) => ({ status, statusDetail });

describe("buildReturnNotice", () => {
  it("sem pagamento verificado: mensagem neutra", () => {
    expect(buildReturnNotice(null, open)).toMatchObject({
      tone: "info",
      title: "Você voltou do Mercado Pago",
    });
  });

  it("aprovado (webhook ainda não chegou): sucesso", () => {
    expect(buildReturnNotice(pay("approved", "accredited"), open)).toMatchObject({
      tone: "success",
      title: "Pagamento aprovado!",
      hidePaymentActions: true,
    });
  });

  it("só aprovado e em análise escondem Pagar/Cancelar (evita pagar duas vezes)", () => {
    const hides = ["approved", "in_process", "pending", "rejected", "cancelled"].map(
      (st) => buildReturnNotice(pay(st), open).hidePaymentActions,
    );
    expect(hides).toEqual([true, true, false, false, false]);
    expect(buildReturnNotice(null, open).hidePaymentActions).toBe(false);
  });

  it("recusado por limite: explica e oferece tentar de novo", () => {
    const n = buildReturnNotice(pay("rejected", "cc_rejected_insufficient_amount"), open);
    expect(n.tone).toBe("warning");
    expect(n.title).toBe("Pagamento não aprovado");
    expect(n.text).toContain("limite");
    expect(n.text).toContain("tentar de novo");
  });

  it("recusado por análise de risco: texto genérico, sem revelar o motivo", () => {
    const n = buildReturnNotice(pay("rejected", "cc_rejected_high_risk"), open);
    expect(n.text).toContain("O pagamento foi recusado.");
    expect(n.text).not.toMatch(/risco|fraude|segurança/i);
  });

  it("recusado com o prazo encerrado: não sugere tentar de novo", () => {
    const n = buildReturnNotice(pay("rejected", "cc_rejected_bad_filled_date"), closed);
    expect(n.text).toContain("validade");
    expect(n.text).toContain("prazo");
    expect(n.text).not.toContain("tentar de novo");
  });

  it("Pix ou boleto gerado e ainda não pago", () => {
    expect(buildReturnNotice(pay("pending", "pending_waiting_transfer"), open).title).toBe(
      "Falta pagar o Pix ou o boleto",
    );
    expect(buildReturnNotice(pay("pending", "pending_waiting_payment"), open).title).toBe(
      "Falta pagar o Pix ou o boleto",
    );
  });

  it("em análise: avisa que não precisa pagar de novo", () => {
    const n = buildReturnNotice(pay("in_process", "pending_review_manual"), open);
    expect(n.title).toBe("Pagamento em análise");
    expect(n.text).toContain("não é preciso pagar de novo");
  });

  it("cancelado/expirado", () => {
    expect(buildReturnNotice(pay("cancelled", "expired"), open)).toMatchObject({
      tone: "warning",
      title: "Pagamento cancelado ou expirado",
    });
  });

  it("status desconhecido cai na mensagem neutra", () => {
    expect(buildReturnNotice(pay("novo_status"), open).title).toBe("Você voltou do Mercado Pago");
  });
});

describe("parsePaymentId", () => {
  it.each(["123456789", "1"])("aceita %s", (v) => {
    expect(parsePaymentId(v)).toBe(v);
  });

  it.each(["null", "", "12a", "../../v1/payments", "123?x=1", "1".repeat(21), undefined, ["123"]])(
    "rejeita %j",
    (v) => {
      expect(parsePaymentId(v)).toBeNull();
    },
  );
});
