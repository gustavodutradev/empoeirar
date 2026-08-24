import "server-only";
import { env } from "@/env";
import { onlyDigits } from "@/lib/validation/cpf";

/**
 * Cliente do Melhor Envio (cotacao de frete). So no SERVIDOR — o token e
 * segredo. Sem MELHORENVIO_TOKEN, isConfigured() e false e o checkout degrada.
 */

// Placeholder ate termos o CEP real da Jane (a preencher).
const FALLBACK_FROM_CEP = "31170000";

function baseUrl(): string {
  const sandbox = env.MELHORENVIO_SANDBOX !== "false"; // default: sandbox
  return sandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}

function fromCep(): string {
  return onlyDigits(env.MELHORENVIO_FROM_CEP ?? FALLBACK_FROM_CEP);
}

export function isMelhorEnvioConfigured(): boolean {
  return Boolean(env.MELHORENVIO_TOKEN);
}

export type FreightProduct = {
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  priceCents: number;
  quantity: number;
};

export type FreightOption = {
  id: number;
  name: string;
  company: string;
  priceCents: number;
  deliveryDays: number;
};

// Defaults conservadores quando a variante nao tem dimensao cadastrada.
const DEFAULT = { weightG: 300, lengthMm: 200, widthMm: 150, heightMm: 30 };

/**
 * Cota o frete para um CEP de destino e uma lista de produtos (com dimensoes
 * vindas do BANCO). Converte mm->cm e g->kg. Retorna as opcoes validas
 * (descarta as que vieram com erro do ME), com preco em centavos.
 */
export async function calculateFreight(input: {
  toCep: string;
  products: FreightProduct[];
}): Promise<FreightOption[]> {
  const token = env.MELHORENVIO_TOKEN;
  if (!token) return [];

  const products = input.products.map((p, i) => ({
    id: String(i + 1),
    width: Math.max(1, Math.round((p.widthMm ?? DEFAULT.widthMm) / 10)),
    height: Math.max(1, Math.round((p.heightMm ?? DEFAULT.heightMm) / 10)),
    length: Math.max(1, Math.round((p.lengthMm ?? DEFAULT.lengthMm) / 10)),
    weight: Math.max(0.1, (p.weightGrams ?? DEFAULT.weightG) / 1000),
    insurance_value: Number((p.priceCents / 100).toFixed(2)),
    quantity: p.quantity,
  }));

  const res = await fetch(`${baseUrl()}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
      // O ME EXIGE User-Agent identificando a aplicacao + e-mail de contato.
      "user-agent": "Empoeirar (contato@empoeirar.com)",
    },
    body: JSON.stringify({
      from: { postal_code: fromCep() },
      to: { postal_code: onlyDigits(input.toCep) },
      products,
      options: { receipt: false, own_hand: false },
    }),
  });

  if (!res.ok) {
    throw new Error(`ME calculate falhou: ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    id: number;
    name: string;
    price?: string;
    custom_price?: string;
    delivery_time?: number;
    custom_delivery_time?: number;
    company?: { name?: string };
    error?: string;
  }>;

  return data
    .filter((s) => !s.error && (s.custom_price ?? s.price))
    .map((s) => ({
      id: s.id,
      name: s.name,
      company: s.company?.name ?? "",
      priceCents: Math.round(Number(s.custom_price ?? s.price) * 100),
      deliveryDays: s.custom_delivery_time ?? s.delivery_time ?? 0,
    }));
}
