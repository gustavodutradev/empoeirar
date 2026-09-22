import { describe, expect, it } from "vitest";
import { isOrderStatus, ORDER_PAGE_HEADLINE, ORDER_STATUS, statusLabel } from "./status";

describe("isOrderStatus", () => {
  it.each(Object.keys(ORDER_STATUS))("reconhece %s", (s) => {
    expect(isOrderStatus(s)).toBe(true);
  });

  // Chaves herdadas de Object.prototype não podem passar como status.
  it.each(["toString", "__proto__", "constructor", "", "PAID"])("rejeita %j", (s) => {
    expect(isOrderStatus(s)).toBe(false);
  });
});

describe("statusLabel", () => {
  it("traduz status conhecido e devolve o valor cru se desconhecido", () => {
    expect(statusLabel("shipped")).toBe("Enviado");
    expect(statusLabel("novo_status")).toBe("novo_status");
  });
});

describe("ORDER_PAGE_HEADLINE", () => {
  it("tem título para todo status", () => {
    for (const s of Object.keys(ORDER_STATUS)) {
      expect(ORDER_PAGE_HEADLINE[s as keyof typeof ORDER_STATUS].title).not.toBe("");
    }
  });
});
