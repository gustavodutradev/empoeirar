import { describe, expect, it } from "vitest";
import { calendarDaysBetween, orderAge } from "./order-age";

// Brasília é UTC-3: 2026-11-10T02:00:00Z ainda é dia 09 às 23h em Brasília.
const at = (iso: string) => new Date(iso);

describe("calendarDaysBetween (dias de calendário em Brasília)", () => {
  it("pago às 23h e visto à 1h do dia seguinte já conta 1 dia", () => {
    expect(calendarDaysBetween(at("2026-11-10T02:00:00Z"), at("2026-11-10T04:00:00Z"))).toBe(1);
  });

  it("mesmo dia em Brasília conta 0, mesmo se o dia em UTC mudou", () => {
    // 10/11 às 20h e 23h59 em Brasília = 23h e 02h59 do dia 11 em UTC.
    expect(calendarDaysBetween(at("2026-11-10T23:00:00Z"), at("2026-11-11T02:59:00Z"))).toBe(0);
  });

  it("exemplo do Jane: pago dia 10, dia 13 = 3 dias", () => {
    expect(calendarDaysBetween(at("2026-11-10T15:00:00Z"), at("2026-11-13T12:00:00Z"))).toBe(3);
  });
});

describe("orderAge", () => {
  const now = at("2026-11-20T15:00:00Z");
  const base = { status: "preparing", shipped_at: null };

  it("sem pagamento não tem contador", () => {
    expect(
      orderAge({ status: "pending_payment", paid_at: null, shipped_at: null }, now),
    ).toBeNull();
  });

  it("cancelado não tem contador", () => {
    expect(
      orderAge({ status: "cancelled", paid_at: "2026-11-01T15:00:00Z", shipped_at: null }, now),
    ).toBeNull();
  });

  it("dentro do prazo: ok", () => {
    expect(orderAge({ ...base, paid_at: "2026-11-18T15:00:00Z" }, now)).toEqual({
      days: 2,
      tone: "ok",
    });
  });

  it("perto do prazo (7 a 10 dias): warning", () => {
    expect(orderAge({ ...base, paid_at: "2026-11-13T15:00:00Z" }, now)?.tone).toBe("warning");
    expect(orderAge({ ...base, paid_at: "2026-11-10T15:00:00Z" }, now)?.tone).toBe("warning");
  });

  it("passou de 10 dias: late", () => {
    expect(orderAge({ ...base, paid_at: "2026-11-09T15:00:00Z" }, now)).toEqual({
      days: 11,
      tone: "late",
    });
  });

  it("depois do envio o contador congela no dia do envio", () => {
    expect(
      orderAge(
        {
          status: "delivered",
          paid_at: "2026-11-01T15:00:00Z",
          shipped_at: "2026-11-05T15:00:00Z",
        },
        now,
      ),
    ).toEqual({ days: 4, tone: "done" });
  });
});
