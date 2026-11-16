import { describe, expect, it } from "vitest";
import { ORDER_FLOW, ORDER_STATUS, type OrderStatus } from "./status";
import { ADMIN_TRANSITIONS, canAdminTransition, isBackwardMove } from "./transitions";

const ALL = Object.keys(ORDER_STATUS) as OrderStatus[];

describe("canAdminTransition", () => {
  it("segue o fluxo um passo por vez", () => {
    expect(canAdminTransition("paid", "preparing")).toBe(true);
    expect(canAdminTransition("preparing", "ready_to_ship")).toBe(true);
    expect(canAdminTransition("ready_to_ship", "shipped")).toBe(true);
    expect(canAdminTransition("shipped", "delivered")).toBe(true);
  });

  it("peça de pronta entrega: pago pode ir direto para pronto para envio", () => {
    expect(canAdminTransition("paid", "ready_to_ship")).toBe(true);
  });

  it("não pula etapas de envio", () => {
    expect(canAdminTransition("paid", "shipped")).toBe(false);
    expect(canAdminTransition("preparing", "shipped")).toBe(false);
    expect(canAdminTransition("paid", "delivered")).toBe(false);
  });

  it("nunca confirma pagamento à mão", () => {
    expect(canAdminTransition("pending_payment", "paid")).toBe(false);
  });

  it("não reabre pedido cancelado", () => {
    for (const to of ALL) expect(canAdminTransition("cancelled", to)).toBe(false);
  });

  it("não cancela depois que o pedido saiu", () => {
    expect(canAdminTransition("shipped", "cancelled")).toBe(false);
    expect(canAdminTransition("delivered", "cancelled")).toBe(false);
  });

  it("para trás, só um passo (desfazer clique errado)", () => {
    expect(canAdminTransition("delivered", "shipped")).toBe(true);
    expect(canAdminTransition("delivered", "paid")).toBe(false);
    expect(canAdminTransition("shipped", "ready_to_ship")).toBe(true);
    expect(canAdminTransition("shipped", "pending_payment")).toBe(false);
  });

  it("toda transição aponta para um status que existe e nunca para o próprio status", () => {
    for (const from of ALL) {
      for (const to of ADMIN_TRANSITIONS[from]) {
        expect(ALL).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });
});

describe("isBackwardMove", () => {
  it("detecta volta no fluxo", () => {
    expect(isBackwardMove("delivered", "shipped")).toBe(true);
    expect(isBackwardMove("ready_to_ship", "preparing")).toBe(true);
  });

  it("avanço e cancelamento não são volta", () => {
    expect(isBackwardMove("preparing", "ready_to_ship")).toBe(false);
    expect(isBackwardMove("ready_to_ship", "cancelled")).toBe(false);
  });

  it("ready_to_ship fica entre preparing e shipped", () => {
    expect(ORDER_FLOW.indexOf("ready_to_ship")).toBe(ORDER_FLOW.indexOf("preparing") + 1);
    expect(ORDER_FLOW.indexOf("shipped")).toBe(ORDER_FLOW.indexOf("ready_to_ship") + 1);
  });
});
