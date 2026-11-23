import { describe, expect, it } from "vitest";
import { EXCLUDED_PAYMENT_TYPES, paymentMethodKind } from "./payment-method";

describe("paymentMethodKind", () => {
  it("Pix pelo método ou pelo tipo", () => {
    expect(paymentMethodKind("pix", "bank_transfer")).toBe("pix");
    expect(paymentMethodKind(null, "bank_transfer")).toBe("pix");
  });

  it("cartões", () => {
    expect(paymentMethodKind("visa", "credit_card")).toBe("card");
    expect(paymentMethodKind("debvisa", "debit_card")).toBe("card");
  });

  it("boleto, saldo e desconhecido não são Pix", () => {
    expect(paymentMethodKind("bolbradesco", "ticket")).toBe("other");
    expect(paymentMethodKind("account_money", "account_money")).toBe("other");
    expect(paymentMethodKind(undefined, undefined)).toBe("other");
  });
});

describe("EXCLUDED_PAYMENT_TYPES", () => {
  it("Pix não exclui Pix; cartão exclui Pix", () => {
    expect(EXCLUDED_PAYMENT_TYPES.pix).not.toContain("bank_transfer");
    expect(EXCLUDED_PAYMENT_TYPES.card).toContain("bank_transfer");
    expect(EXCLUDED_PAYMENT_TYPES.pix).toContain("credit_card");
    expect(EXCLUDED_PAYMENT_TYPES.card).not.toContain("credit_card");
  });
});
