import { describe, expect, it } from "vitest";
import {
  decideUnpaidOrder,
  isPaymentWindowOpen,
  paymentDeadline,
  staleCutoff,
  toMercadoPagoDate,
} from "./expiration";

const created = "2026-10-01T15:00:00.000Z";
const hours = (h: number) => new Date(Date.parse(created) + h * 3600_000);

describe("prazo de pagamento", () => {
  it("vence 3 dias depois da criação", () => {
    expect(paymentDeadline(created).toISOString()).toBe("2026-10-04T15:00:00.000Z");
  });

  it("aberto até o último instante, fechado a partir do prazo", () => {
    expect(isPaymentWindowOpen(created, hours(0))).toBe(true);
    expect(isPaymentWindowOpen(created, hours(72 - 0.001))).toBe(true);
    expect(isPaymentWindowOpen(created, hours(72))).toBe(false);
  });
});

describe("staleCutoff", () => {
  it("é 7 dias antes de agora: só pedido criado antes disso expira", () => {
    expect(staleCutoff(new Date("2026-10-08T15:00:00.000Z")).toISOString()).toBe(created);
  });

  it("há folga de 4 dias entre o fim do prazo e o cancelamento (compensação de boleto)", () => {
    const gap = Date.parse(created) - staleCutoff(paymentDeadline(created)).getTime();
    expect(gap).toBe(4 * 24 * 3600_000);
  });
});

describe("toMercadoPagoDate", () => {
  it("converte para o horário de Brasília com fuso explícito", () => {
    expect(toMercadoPagoDate(new Date("2026-10-04T15:00:00.000Z"))).toBe(
      "2026-10-04T12:00:00.000-03:00",
    );
  });

  it("vira o dia corretamente perto da meia-noite UTC", () => {
    expect(toMercadoPagoDate(new Date("2026-10-05T01:30:00.000Z"))).toBe(
      "2026-10-04T22:30:00.000-03:00",
    );
  });
});

describe("decideUnpaidOrder", () => {
  it("sem pagamentos: cancela", () => {
    expect(decideUnpaidOrder([])).toBe("cancel");
  });

  it("só pagamentos que falharam: cancela", () => {
    expect(decideUnpaidOrder([{ status: "rejected" }, { status: "cancelled" }])).toBe("cancel");
  });

  it.each(["pending", "in_process", "authorized"])(
    "pagamento %s em andamento: NÃO cancela",
    (status) => {
      expect(decideUnpaidOrder([{ status: "rejected" }, { status }])).toBe("payment_in_progress");
    },
  );

  it("pagamento aprovado vence tudo: webhook perdido, não cancela", () => {
    expect(decideUnpaidOrder([{ status: "pending" }, { status: "approved" }])).toBe(
      "approved_not_confirmed",
    );
  });

  it("estornado não segura o pedido", () => {
    expect(decideUnpaidOrder([{ status: "refunded" }])).toBe("cancel");
  });
});
