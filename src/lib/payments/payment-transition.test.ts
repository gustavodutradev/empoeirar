import { describe, expect, it } from "vitest";
import {
  decidePaymentTransition,
  type OrderSnapshot,
  type PaymentSnapshot,
} from "./payment-transition";

const pendingOrder: OrderSnapshot = {
  status: "pending_payment",
  mpPaymentId: null,
  totalCents: 15900,
};
const paidOrder: OrderSnapshot = { status: "paid", mpPaymentId: "111", totalCents: 15900 };

const pay = (status: string, id = "111", amountCents = 15900): PaymentSnapshot => ({
  id,
  status,
  amountCents,
});

describe("decidePaymentTransition — o bug que motivou a mudança", () => {
  it("cartão recusado NÃO cancela: o pedido segue aguardando e o cliente pode tentar de novo", () => {
    expect(decidePaymentTransition(pendingOrder, pay("rejected"))).toEqual({
      action: "ignore",
      reason: "payment_failed",
      alert: false,
    });
  });

  it("recusado e depois aprovado (outro pagamento) confirma o pedido", () => {
    // O recusado não mexeu no pedido, então ele ainda está em pending_payment.
    expect(decidePaymentTransition(pendingOrder, pay("approved", "222"))).toMatchObject({
      action: "advance",
      to: "paid",
      paymentId: "222",
    });
  });

  it("Pix abandonado que expira depois NÃO cancela pedido já pago no cartão", () => {
    expect(decidePaymentTransition(paidOrder, pay("cancelled", "999"))).toMatchObject({
      action: "ignore",
      reason: "payment_failed",
    });
  });

  it("reenvio de 'pending' NÃO volta pedido pago para aguardando", () => {
    expect(decidePaymentTransition(paidOrder, pay("pending", "999"))).toMatchObject({
      action: "ignore",
      reason: "payment_in_progress",
    });
  });
});

describe("decidePaymentTransition — aprovado", () => {
  it("confirma pedido aguardando, com o valor certo, e grava o id do pagamento", () => {
    expect(decidePaymentTransition(pendingOrder, pay("approved"))).toEqual({
      action: "advance",
      to: "paid",
      note: "Pagamento aprovado.",
      paymentId: "111",
    });
  });

  it.each([15899, 15901, 0])("valor divergente (%i) não confirma e alerta", (amount) => {
    expect(decidePaymentTransition(pendingOrder, pay("approved", "111", amount))).toEqual({
      action: "ignore",
      reason: "amount_mismatch",
      alert: true,
    });
  });

  it.each(["paid", "preparing", "shipped", "delivered"])(
    "reenvio do MESMO pagamento em pedido %s é no-op silencioso",
    (status) => {
      expect(
        decidePaymentTransition({ ...paidOrder, status }, pay("approved", "111")),
      ).toMatchObject({ action: "ignore", reason: "already_paid", alert: false });
    },
  );

  it("OUTRO pagamento aprovado em pedido já pago = pagamento duplicado, alerta", () => {
    expect(decidePaymentTransition(paidOrder, pay("approved", "222"))).toMatchObject({
      action: "ignore",
      reason: "duplicate_payment",
      alert: true,
    });
  });

  it("aprovado em pedido cancelado não reativa sozinho, alerta", () => {
    expect(
      decidePaymentTransition({ ...pendingOrder, status: "cancelled" }, pay("approved")),
    ).toMatchObject({ action: "ignore", reason: "paid_after_cancel", alert: true });
  });
});

describe("decidePaymentTransition — estorno e chargeback", () => {
  it("estorno do pagamento que pagou cancela o pedido", () => {
    expect(decidePaymentTransition(paidOrder, pay("refunded", "111"))).toEqual({
      action: "advance",
      to: "cancelled",
      note: "Pagamento estornado.",
      paymentId: null,
    });
  });

  it("chargeback do pagamento que pagou cancela, mesmo já entregue", () => {
    expect(
      decidePaymentTransition({ ...paidOrder, status: "delivered" }, pay("charged_back", "111")),
    ).toMatchObject({ action: "advance", to: "cancelled", paymentId: null });
  });

  it("estorno de OUTRO pagamento (ex.: o duplicado) não cancela o pedido", () => {
    expect(decidePaymentTransition(paidOrder, pay("refunded", "222"))).toMatchObject({
      action: "ignore",
      reason: "refund_of_other_payment",
    });
  });

  it("estorno com pedido ainda sem pagamento registrado não cancela", () => {
    expect(decidePaymentTransition(pendingOrder, pay("refunded", "111"))).toMatchObject({
      action: "ignore",
      reason: "refund_of_other_payment",
    });
  });

  it("reenvio do estorno em pedido já cancelado é no-op", () => {
    expect(
      decidePaymentTransition({ ...paidOrder, status: "cancelled" }, pay("refunded", "111")),
    ).toMatchObject({ action: "ignore", reason: "already_cancelled", alert: false });
  });
});

describe("decidePaymentTransition — demais status", () => {
  it.each(["pending", "in_process", "authorized"])("%s não mexe no pedido", (status) => {
    expect(decidePaymentTransition(pendingOrder, pay(status))).toMatchObject({
      action: "ignore",
      reason: "payment_in_progress",
      alert: false,
    });
  });

  it("disputa (in_mediation) não mexe no pedido, mas alerta", () => {
    expect(decidePaymentTransition(paidOrder, pay("in_mediation"))).toMatchObject({
      action: "ignore",
      reason: "in_mediation",
      alert: true,
    });
  });

  it.each(["", "APPROVED", "novo_status_do_mp"])("status desconhecido %j alerta", (status) => {
    expect(decidePaymentTransition(pendingOrder, pay(status))).toMatchObject({
      action: "ignore",
      reason: "unknown_status",
      alert: true,
    });
  });

  it("nenhum caminho grava id de pagamento fora da confirmação", () => {
    const orders = [pendingOrder, paidOrder, { ...paidOrder, status: "cancelled" }];
    const statuses = ["approved", "rejected", "cancelled", "refunded", "charged_back", "pending"];
    for (const order of orders) {
      for (const status of statuses) {
        const d = decidePaymentTransition(order, pay(status, "333"));
        if (d.action === "advance" && d.to !== "paid") expect(d.paymentId).toBeNull();
      }
    }
  });
});
