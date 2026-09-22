import { describe, expect, it } from "vitest";
import { mapPaymentStatus, verifyWebhookSignature } from "./webhook-verify";

// Vetores fixos calculados fora do código (HMAC-SHA256 do manifesto no formato
// documentado pelo Mercado Pago). Se alguém mudar o formato do manifesto, estes
// testes quebram, e é esse o objetivo: o formato é um contrato com o MP.
const SECRET = "segredo-de-teste-nao-e-real";
const TS = "1700000000";
const SIG_WITH_REQUEST_ID = "42495e21d29351b2e6827adec1b1b6a3387858937f26f09c49317b8859712c82";
const SIG_WITHOUT_REQUEST_ID = "4e9e3cc27192d8d99d4fd1f13651bff4dc02526e357a4e7fefcf8209e98b19a8";
const SIG_ALNUM_ID = "c5f4d947fcefede563c8851baa4a1d9e38019f0e96e5054e75db8858696eea4e";

const valid = {
  xSignature: `ts=${TS},v1=${SIG_WITH_REQUEST_ID}`,
  xRequestId: "req-abc",
  dataId: "123456789",
};

describe("verifyWebhookSignature", () => {
  it("aceita assinatura válida com x-request-id", () => {
    expect(verifyWebhookSignature(SECRET, valid)).toBe(true);
  });

  it("aceita assinatura válida sem x-request-id (manifesto sem esse trecho)", () => {
    expect(
      verifyWebhookSignature(SECRET, {
        xSignature: `ts=${TS},v1=${SIG_WITHOUT_REQUEST_ID}`,
        xRequestId: null,
        dataId: "123456789",
      }),
    ).toBe(true);
  });

  it("normaliza data.id para minúsculo antes de assinar", () => {
    expect(
      verifyWebhookSignature(SECRET, {
        ...valid,
        xSignature: `ts=${TS},v1=${SIG_ALNUM_ID}`,
        dataId: "ABC123DEF",
      }),
    ).toBe(true);
  });

  it("tolera espaços e ordem invertida no header", () => {
    expect(
      verifyWebhookSignature(SECRET, {
        ...valid,
        xSignature: ` v1=${SIG_WITH_REQUEST_ID} , ts=${TS} `,
      }),
    ).toBe(true);
  });

  it.each([
    ["segredo errado", { secret: "outro-segredo" }],
    ["data.id adulterado", { dataId: "999999999" }],
    ["request-id adulterado", { xRequestId: "req-xyz" }],
    ["ts adulterado", { xSignature: `ts=1700000001,v1=${SIG_WITH_REQUEST_ID}` }],
    ["v1 com um caractere trocado", { xSignature: `ts=${TS},v1=5${SIG_WITH_REQUEST_ID.slice(1)}` }],
    ["v1 truncado", { xSignature: `ts=${TS},v1=${SIG_WITH_REQUEST_ID.slice(0, 32)}` }],
    ["v1 que não é hex", { xSignature: `ts=${TS},v1=${"z".repeat(64)}` }],
    ["sem ts", { xSignature: `v1=${SIG_WITH_REQUEST_ID}` }],
    ["sem v1", { xSignature: `ts=${TS}` }],
    ["header ausente", { xSignature: null }],
    ["header vazio", { xSignature: "" }],
    ["data.id vazio", { dataId: "" }],
    ["segredo vazio (env não configurada)", { secret: "" }],
  ])("rejeita: %s", (_name, override) => {
    const { secret = SECRET, ...parts } = override as { secret?: string } & Partial<typeof valid>;
    expect(verifyWebhookSignature(secret, { ...valid, ...parts })).toBe(false);
  });
});

describe("mapPaymentStatus", () => {
  it.each([
    ["approved", "paid"],
    ["rejected", "cancelled"],
    ["cancelled", "cancelled"],
    ["refunded", "cancelled"],
    ["charged_back", "cancelled"],
    ["pending", "pending_payment"],
    ["in_process", "pending_payment"],
    ["authorized", "pending_payment"],
  ])("%s -> %s", (mp, expected) => {
    expect(mapPaymentStatus(mp)).toBe(expected);
  });

  it.each(["in_mediation", "", "APPROVED", "desconhecido"])(
    "status %j não muda o pedido (null)",
    (mp) => {
      expect(mapPaymentStatus(mp)).toBeNull();
    },
  );
});
