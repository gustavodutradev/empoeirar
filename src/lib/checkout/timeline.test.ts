import { describe, expect, it } from "vitest";
import { buildOrderTimeline, type TimelineEvent } from "./timeline";

const ev = (status: string, day: string, note: string | null = null): TimelineEvent => ({
  status,
  note,
  created_at: `2026-09-${day}T12:00:00Z`,
});

/** Resumo compacto para comparar a régua inteira numa linha. */
const summary = (steps: ReturnType<typeof buildOrderTimeline>) =>
  steps.map((s) => `${s.status}${s.reached ? "" : "?"}${s.tone === "cancelled" ? "!" : ""}`);

describe("buildOrderTimeline", () => {
  it("pedido ativo mostra a régua completa, com etapas futuras pendentes", () => {
    const steps = buildOrderTimeline("paid", [ev("pending_payment", "01"), ev("paid", "02")]);
    expect(summary(steps)).toEqual([
      "pending_payment",
      "paid",
      "preparing?",
      "shipped?",
      "delivered?",
    ]);
    expect(steps[1].at).toBe("2026-09-02T12:00:00Z");
    expect(steps[2].at).toBeNull();
  });

  it("cancelado sem pagar: recebido -> cancelado, sem etapas futuras", () => {
    const steps = buildOrderTimeline("cancelled", [
      ev("pending_payment", "01"),
      ev("cancelled", "02", "Pagamento recusado"),
    ]);
    expect(summary(steps)).toEqual(["pending_payment", "cancelled!"]);
    expect(steps.at(-1)).toMatchObject({
      description: "Pagamento recusado",
      at: "2026-09-02T12:00:00Z",
    });
  });

  it("cancelado depois do preparo mantém o que aconteceu antes", () => {
    const steps = buildOrderTimeline("cancelled", [
      ev("pending_payment", "01"),
      ev("paid", "02"),
      ev("preparing", "03"),
      ev("cancelled", "04"),
    ]);
    expect(summary(steps)).toEqual(["pending_payment", "paid", "preparing", "cancelled!"]);
  });

  it("não depende da ordem em que a query devolveu os eventos", () => {
    const steps = buildOrderTimeline("cancelled", [
      ev("cancelled", "04"),
      ev("paid", "02"),
      ev("pending_payment", "01"),
    ]);
    expect(summary(steps)).toEqual(["pending_payment", "paid", "cancelled!"]);
  });

  it("reativado (cancelado -> pago) volta à régua normal", () => {
    const steps = buildOrderTimeline("paid", [
      ev("pending_payment", "01"),
      ev("cancelled", "02"),
      ev("paid", "03"),
    ]);
    expect(summary(steps)).toEqual([
      "pending_payment",
      "paid",
      "preparing?",
      "shipped?",
      "delivered?",
    ]);
  });

  it("cancelado duas vezes usa o ÚLTIMO cancelamento e o que veio antes dele", () => {
    const steps = buildOrderTimeline("cancelled", [
      ev("pending_payment", "01"),
      ev("cancelled", "02"),
      ev("paid", "03"),
      ev("cancelled", "05", "Estornado"),
    ]);
    expect(summary(steps)).toEqual(["pending_payment", "paid", "cancelled!"]);
    expect(steps.at(-1)?.description).toBe("Estornado");
  });

  it("status repetido usa o evento mais recente", () => {
    const steps = buildOrderTimeline("pending_payment", [
      ev("pending_payment", "01", "primeiro"),
      ev("pending_payment", "03", "segundo"),
    ]);
    expect(steps[0]).toMatchObject({ description: "segundo", at: "2026-09-03T12:00:00Z" });
  });

  it("cancelado sem evento de cancelamento (dado inconsistente) não quebra", () => {
    const steps = buildOrderTimeline("cancelled", [ev("pending_payment", "01")]);
    expect(summary(steps)).toEqual(["pending_payment", "cancelled!"]);
    expect(steps.at(-1)?.at).toBeNull();
  });

  it("sem eventos: régua toda pendente, e usa a descrição padrão", () => {
    const steps = buildOrderTimeline("pending_payment", []);
    expect(steps.every((s) => !s.reached)).toBe(true);
    expect(steps[0].description).toBe("Aguardando pagamento.");
  });
});
