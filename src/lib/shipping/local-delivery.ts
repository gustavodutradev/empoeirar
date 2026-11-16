import { normalizeText } from "@/lib/text";
import type { FreightOption } from "./melhor-envio";

/**
 * Entrega local em Belo Horizonte, feita pelo próprio Jane. Funções puras:
 * a leitura do banco e da ViaCEP fica em local-delivery-server.ts.
 */

/**
 * Id da opção no checkout. Os ids do Melhor Envio são positivos, então um
 * negativo nunca colide com uma transportadora.
 */
export const LOCAL_DELIVERY_ID = -1;

export const LOCAL_DELIVERY_NAME = "Entrega local (Belo Horizonte)";

const CITY = normalizeText("Belo Horizonte");
const STATE = "MG";

export type LocalDeliveryConfig = {
  enabled: boolean;
  priceCents: number;
  deliveryDays: number;
};

/**
 * O endereço é atendido? `address` precisa vir da ViaCEP (consultada no
 * servidor), nunca do formulário.
 *
 * Comparação exata do nome do bairro, sem acento e sem maiúsculas. Exata de
 * propósito: "Horto" e "Horto Florestal" são bairros diferentes em BH, e
 * "contém" aceitaria os dois.
 */
export function isLocalDeliveryAddress(
  address: { city: string; state: string; district: string },
  districts: readonly string[],
): boolean {
  if (normalizeText(address.city) !== CITY) return false;
  if (address.state.trim().toUpperCase() !== STATE) return false;
  const district = normalizeText(address.district);
  if (!district) return false;
  return districts.some((d) => normalizeText(d) === district);
}

export function localDeliveryOption(config: LocalDeliveryConfig): FreightOption {
  return {
    id: LOCAL_DELIVERY_ID,
    name: LOCAL_DELIVERY_NAME,
    company: "",
    priceCents: config.priceCents,
    deliveryDays: config.deliveryDays,
    tag: "Entrega pelo ateliê",
  };
}
