import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits } from "@/lib/validation/cpf";

/**
 * Proxy de CEP (ViaCEP) no servidor.
 *
 * Por que no servidor e nao direto do browser: a CSP e restrita
 * (connect-src so 'self' + Supabase). Em vez de afrouxar a CSP para liberar o
 * dominio da ViaCEP, o browser chama a nossa rota (mesma origem) e nos fazemos o
 * fetch externo aqui. CSP continua fechada.
 *
 * Anti-SSRF: o CEP e reduzido a 8 digitos e interpolado em um host FIXO. Nao ha
 * como o cliente redirecionar o fetch para outro destino.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ cep: string }> }) {
  const { cep: rawCep } = await ctx.params;
  const cep = onlyDigits(rawCep);

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  // Rate limit por IP: a rota é pública e faz fetch externo (ViaCEP). Limita
  // abuso/scraping sem atrapalhar digitação normal do CEP.
  const ip = clientIp(_request.headers);
  if (!(await allowRequest(createAdminClient(), `cep:${ip}`, 60, 60))) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Não foi possível consultar o CEP." }, { status: 502 });
    }

    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return NextResponse.json(
      {
        street: data.logradouro ?? "",
        district: data.bairro ?? "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      },
      // Cache leve: CEP muda raramente; alivia a ViaCEP em digitação repetida.
      { headers: { "cache-control": "public, max-age=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o CEP." }, { status: 502 });
  }
}
