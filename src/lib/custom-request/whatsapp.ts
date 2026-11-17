import { siteConfig } from "@/lib/site-config";

const MAX_DESCRIPTION_IN_MESSAGE = 500;

/**
 * Link do WhatsApp do ateliê com a mensagem já escrita. A descrição vai
 * resumida (links muito longos falham em alguns aparelhos); a versão completa
 * e as fotos chegam por e-mail, e a mensagem diz isso.
 */
export function customRequestWhatsAppUrl(input: {
  reference: string;
  name: string;
  description: string;
}): string {
  const description =
    input.description.length > MAX_DESCRIPTION_IN_MESSAGE
      ? `${input.description.slice(0, MAX_DESCRIPTION_IN_MESSAGE).trimEnd()}…`
      : input.description;

  const text = [
    `Olá! Sou ${input.name} e acabei de enviar um pedido de molde personalizado pelo site (nº ${input.reference}).`,
    "",
    description,
    "",
    "As fotos e os detalhes completos foram enviados por e-mail.",
  ].join("\n");

  const url = new URL(siteConfig.whatsappUrl);
  url.searchParams.set("text", text);
  return url.toString();
}
