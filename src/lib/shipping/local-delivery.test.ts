import { describe, expect, it } from "vitest";
import { isLocalDeliveryAddress, LOCAL_DELIVERY_ID, localDeliveryOption } from "./local-delivery";

const DISTRICTS = ["União", "Sagrada Família", "Horto", "Funcionários", "Fernão Dias"];
const bh = (district: string) => ({ city: "Belo Horizonte", state: "MG", district });

describe("isLocalDeliveryAddress", () => {
  it("bairro da lista em BH: atende", () => {
    expect(isLocalDeliveryAddress(bh("Sagrada Família"), DISTRICTS)).toBe(true);
  });

  it("ignora acento, maiúsculas e espaços extras", () => {
    expect(isLocalDeliveryAddress(bh("  sagrada   familia "), DISTRICTS)).toBe(true);
    expect(isLocalDeliveryAddress(bh("FUNCIONARIOS"), DISTRICTS)).toBe(true);
    expect(isLocalDeliveryAddress(bh("Uniao"), DISTRICTS)).toBe(true);
  });

  it("comparação exata: Horto Florestal não é Horto", () => {
    expect(isLocalDeliveryAddress(bh("Horto Florestal"), DISTRICTS)).toBe(false);
  });

  it("bairro fora da lista: não atende", () => {
    expect(isLocalDeliveryAddress(bh("Pampulha"), DISTRICTS)).toBe(false);
  });

  it("mesmo nome de bairro em outra cidade: não atende", () => {
    expect(
      isLocalDeliveryAddress({ city: "Contagem", state: "MG", district: "União" }, DISTRICTS),
    ).toBe(false);
    expect(
      isLocalDeliveryAddress({ city: "Belo Horizonte", state: "SP", district: "União" }, DISTRICTS),
    ).toBe(false);
  });

  it("CEP sem bairro (ex.: CEP geral): não atende", () => {
    expect(isLocalDeliveryAddress(bh(""), DISTRICTS)).toBe(false);
  });

  it("lista vazia: não atende", () => {
    expect(isLocalDeliveryAddress(bh("União"), [])).toBe(false);
  });
});

describe("localDeliveryOption", () => {
  it("usa id negativo, que nunca colide com o Melhor Envio", () => {
    const option = localDeliveryOption({ enabled: true, priceCents: 1000, deliveryDays: 2 });
    expect(option).toMatchObject({ id: LOCAL_DELIVERY_ID, priceCents: 1000, deliveryDays: 2 });
    expect(option.id).toBeLessThan(0);
  });
});
