import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { lookupCep } from "@/lib/shipping/cep";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits } from "@/lib/validation/cpf";

/**
 * Proxy de CEP (ViaCEP) no servidor.
 *
 * Por que no servidor e nao direto do browser: a CSP e restrita
 * (connect-src so 'self' + Supabase). Em vez de afrouxar a CSP para liberar o
 * dominio da ViaCEP, o browser chama a nossa rota (mesma origem) e nos fazemos o
 * fetch externo aqui (lookupCep, que tambem cuida do anti-SSRF).
 */
export async function GET(request: Request, ctx: { params: Promise<{ cep: string }> }) {
  const { cep: rawCep } = await ctx.params;
  if (onlyDigits(rawCep).length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  // Rate limit por IP: a rota é pública e faz fetch externo (ViaCEP). Limita
  // abuso/scraping sem atrapalhar digitação normal do CEP.
  const ip = clientIp(request.headers);
  if (!(await allowRequest(createAdminClient(), `cep:${ip}`, 60, 60))) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um instante." }, { status: 429 });
  }

  const result = await lookupCep(rawCep);
  if (!result.ok) {
    return result.reason === "not_found"
      ? NextResponse.json({ error: "CEP não encontrado." }, { status: 404 })
      : NextResponse.json({ error: "Não foi possível consultar o CEP." }, { status: 502 });
  }

  const { street, district, city, state } = result.address;
  return NextResponse.json(
    { street, district, city, state },
    // Cache leve: CEP muda raramente; alivia a ViaCEP em digitação repetida.
    { headers: { "cache-control": "public, max-age=86400" } },
  );
}
