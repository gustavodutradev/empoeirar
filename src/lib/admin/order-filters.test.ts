import { describe, expect, it } from "vitest";
import { DEFAULT_ORDER_FILTER, OPEN_STATUSES, parseOrderFilter } from "./order-filters";

describe("parseOrderFilter", () => {
  it("sem parâmetro: em aberto (pago, em preparação, pronto para envio)", () => {
    expect(parseOrderFilter(undefined)).toBe(DEFAULT_ORDER_FILTER);
    expect(DEFAULT_ORDER_FILTER.statuses).toEqual(OPEN_STATUSES);
  });

  it("status válido filtra só ele", () => {
    expect(parseOrderFilter("paid").statuses).toEqual(["paid"]);
    expect(parseOrderFilter("ready_to_ship").statuses).toEqual(["ready_to_ship"]);
  });

  it("todos remove o filtro", () => {
    expect(parseOrderFilter("todos").statuses).toBeNull();
  });

  it.each(["", "xyz", "paid,shipped", "'); drop table x;--", "__proto__", "constructor"])(
    "valor inválido %j cai no padrão",
    (value) => {
      expect(parseOrderFilter(value)).toBe(DEFAULT_ORDER_FILTER);
    },
  );

  it("parâmetro repetido usa o primeiro", () => {
    expect(parseOrderFilter(["shipped", "paid"]).statuses).toEqual(["shipped"]);
  });
});
