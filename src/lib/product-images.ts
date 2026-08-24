// GERADO — mapa slug -> fotos em public/produtos (nomes originais).
// Ponte de teste: em producao, as imagens migram para o Supabase Storage e
// este mapa e substituido por dados da tabela product_image.

const productImages: Record<string, string[]> = {
  banana: ["Banana 1.png", "Banana 2.png", "Banana 3.png", "Banana 4.png"],
  barcos: ["Barcos 1.png", "Barcos 2.png", "Barcos 3.png", "Barcos 4.png"],
  "conjunto-de-bowls": ["Bowls 1.png", "Bowls 2.png", "Bowls 3.png", "Bowls 4.png"],
  canoa: ["Canoa 1.png", "Canoa 2.png", "Canoa 3.png", "Canoa 4.png"],
  capivaras: ["Capivaras 1.png", "Capivaras 2.png", "Capivaras 3.png", "Capivaras 4.png"],
  "conjunto-carai": ["Caraí 1.png", "Caraí 2.png", "Caraí 3.png"],
  conchas: ["Conchas 1.png", "Conchas 2.png", "Conchas 3.png", "Conchas 4.png"],
  copo: [
    "Copo Médio 1.png",
    "Copo Pequeno 1.png",
    "Corpo Grande 1.png",
    "Copo Médio 2.png",
    "Copo Pequeno 2.png",
    "Copo Médio 3.png",
    "Copo Pequeno 3.png",
  ],
  coracoes: ["Corações 1.png", "Corações 2.png", "Corações 3.png", "Corações 4.png"],
  "disco-para-torno-inteirico": [
    "Discos Para Torno 1.png",
    "Discos Para Torno 2.png",
    "Discos Para Torno 3.png",
    "Discos Para Torno 4.png",
  ],
  "disco-com-miolo-removivel-para-torno": [
    "Discos Para Torno com Miolo Removível 1.png",
    "Discos Para Torno com Miolo Removível 2.png",
    "Discos Para Torno com Miolo Removível 3.png",
    "Discos Para Torno com Miolo Removível 4.png",
  ],
  estrelas: ["Estrelas 1.png", "Estrelas 2.png", "Estrelas 3.png", "Estrelas 4.png"],
  gatinhos: ["Gatinhos 1.png", "Gatinhos 2.png", "Gatinhos 3.png", "Gatinhos 4.png"],
  "conjunto-itinga": ["Itinga 1.png", "Itinga 2.png", "Itinga 3.png", "Itinga 4.png"],
  "limao-siciliano": [
    "Limão Siciliano 1.png",
    "Limão Siciliano 2.png",
    "Limão Siciliano 3.png",
    "Limão Siciliano 4.png",
  ],
  luas: ["Luas 1.png", "Luas 2.png", "Luas 3.png", "Luas 4.png"],
  maca: ["Maça 1.png", "Maça 2.png", "Maça 3.png", "Maça 4.png"],
  melancia: ["Melancia 1.png", "Melancia 2.png", "Melancia 3.png"],
  "conjunto-minas-novas": [
    "Minas Novas 1.png",
    "Minas Novas 2.png",
    "Minas Novas 3.png",
    "Minas Novas 4.png",
  ],
  "conjunto-padre-paraiso": [
    "Padre Paraíso 1.png",
    "Padre Paraíso 2.png",
    "Padre Paraíso 3.png",
    "Padre Paraíso 4.png",
  ],
  "conjunto-pasmado": ["Pasmado 1.png", "Pasmado 2.png", "Pasmado 3.png"],
  pera: ["Pera 1.png", "Pera 2.png", "Pera 3.png", "Pera 4.png"],
  pizza: ["Pizza 1.png", "Pizza 2.png", "Pizza 3.png", "Pizza 4.png"],
  "paes-de-forma": [
    "Pão de forma frente.png",
    "Pão de forma.png",
    "Pão de Forma 3.png",
    "Pão de forma 4.png",
  ],
  "prato-de-risoto": ["Risoto 1.png", "Risoto 2.png", "Risoto 3.png", "Risoto 4.png"],
  "conjunto-sushi-arredondado": [
    "Sushi Arredondado 1.png",
    "Sushi Arredondado 2.png",
    "Sushi Arredondado 3.png",
    "Sushi Arredondado 4.png",
  ],
  "conjunto-sushi-reto": [
    "Sushi Reto 1.png",
    "Sushi Reto 2.png",
    "Sushi Reto 3.png",
    "Sushi Reto 4.png",
  ],
  "conjunto-taiobeiras": [
    "Taiobeiras 1.png",
    "Taiobeiras 2.png",
    "Taiobeiras 3.png",
    "Taiobeiras 4.png",
  ],
  "conjunto-turmalina": ["Turmalina.png", "Turmalina 2.png", "Turmalina 3.png", "Turmalina 4.png"],
  "molde-personalizado": [
    "Um Molde Para Chamar De Seu 1.png",
    "Um Molde Para Chamar De Seu 2.png",
    "Um Molde Para Chamar De Seu 3.png",
    "Um Molde Para Chamar De Seu 4.png",
  ],
  ursinhos: ["Ursinhos 1.png", "Ursinhos 2.png", "Ursinhos 3.png", "Ursinhos 4.png"],
};

import { env } from "@/env";

/**
 * Base das URLs das fotos.
 * - Local (Supabase local): serve de `public/produtos` (as fotos estao no disco).
 * - Producao/staging: serve do bucket publico `produtos` no Supabase Storage.
 * A troca e automatica pela URL do Supabase, sem env extra.
 */
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const isLocalSupabase = url.includes("127.0.0.1") || url.includes("localhost");
const imageBase = isLocalSupabase ? "/produtos" : `${url}/storage/v1/object/public/produtos`;

/** URLs (encodadas) das fotos de um produto; [] se nao houver foto. */
export function getProductImages(slug: string): string[] {
  return (productImages[slug] ?? []).map((f) => `${imageBase}/${encodeURIComponent(f)}`);
}
