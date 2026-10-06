import { serializeJsonLd } from "@/lib/seo";

/**
 * Bloco de dados estruturados (schema.org) para o Google. Não é JavaScript:
 * o navegador não executa `type="application/ld+json"`, então a CSP (nonce)
 * não se aplica.
 *
 * Usa dangerouslySetInnerHTML porque é o único jeito de pôr texto cru dentro
 * de <script> no React. É seguro aqui porque serializeJsonLd escapa "<", ">"
 * e "&": nenhum texto vindo do banco consegue fechar a tag (testado em
 * seo.test.ts).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON serializado com escape de <, > e & (serializeJsonLd)
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
