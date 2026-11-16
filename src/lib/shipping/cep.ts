import "server-only";
import { onlyDigits } from "@/lib/validation/cpf";

export type CepAddress = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

export type CepLookup =
  | { ok: true; address: CepAddress }
  | { ok: false; reason: "invalid" | "not_found" | "unavailable" };

/**
 * Consulta a ViaCEP no servidor. Fonte única para a rota /api/cep (preenche o
 * formulário) e para a regra de entrega local (o bairro que vale é o daqui, não
 * o que o cliente digitou).
 *
 * Anti-SSRF: o CEP é reduzido a 8 dígitos e interpolado em um host FIXO.
 */
export async function lookupCep(rawCep: string): Promise<CepLookup> {
  const cep = onlyDigits(rawCep);
  if (cep.length !== 8) return { ok: false, reason: "invalid" };

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json" },
      // CEP muda raramente: o cache do Next evita bater na ViaCEP a cada cotação.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return { ok: false, reason: "unavailable" };

    const data = (await res.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return { ok: false, reason: "not_found" };

    return {
      ok: true,
      address: {
        cep,
        street: data.logradouro ?? "",
        district: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
