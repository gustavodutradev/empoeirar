import { LegalPage } from "@/components/site/legal-page";
import { formatBRL } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Política de envio" };

// Bairros e tarifa da entrega local vêm do banco (o Jane edita pelo admin),
// então o texto nunca fica desatualizado em relação ao checkout.

export default async function Page() {
  const supabase = await createClient();
  const [{ data: config }, { data: districts }] = await Promise.all([
    supabase
      .from("local_delivery_config")
      .select("enabled, price_cents, delivery_days")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("local_delivery_district").select("name").order("name"),
  ]);
  const local =
    config?.enabled && districts && districts.length > 0
      ? { config, names: districts.map((d) => d.name as string) }
      : null;

  return (
    <LegalPage title="Política de Envio" updatedAt="16 de novembro de 2026">
      <p>
        Esta Política explica como funcionam a produção e o envio dos produtos da Empoeirar. Como
        cada peça é feita à mão, os prazos combinam o tempo de produção com o tempo de transporte.
      </p>

      <h2>1. Prazo de produção</h2>
      <p>
        Peças em pronta entrega são despachadas primeiro. Itens produzidos sob demanda têm prazo de
        até 10 dias para produção, contados a partir da confirmação do pedido. Qualquer alteração no
        prazo é comunicada a você.
      </p>

      <h2>2. Modalidades de entrega</h2>
      <p>
        Enviamos para todo o Brasil por transportadora. O frete é calculado no momento da compra,
        conforme o CEP de destino, e você escolhe entre as opções disponíveis antes de finalizar o
        pedido.
      </p>
      {local ? (
        <p>
          <strong>Entrega local em Belo Horizonte.</strong> Nos bairros{" "}
          {new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(local.names)}, a entrega é
          feita pelo próprio ateliê, por {formatBRL(local.config.price_cents)}, em até{" "}
          {local.config.delivery_days} dia(s) úteis depois que o pedido fica pronto. A opção aparece
          no checkout automaticamente quando o CEP de entrega é de um desses bairros, conforme a
          base de CEPs dos Correios.
        </p>
      ) : null}

      <h2>3. Prazo de transporte</h2>
      <p>
        Após a postagem, o prazo de entrega é o estimado pela transportadora no momento da compra e
        não depende da Empoeirar. Contratempos logísticos da transportadora podem afetar a data
        final.
      </p>

      <h2>4. Frete</h2>
      <p>
        O valor do frete é calculado e exibido no checkout, conforme o CEP de destino, com base nas
        dimensões e no peso das peças do pedido. O valor cobrado é sempre o confirmado pelo servidor
        no momento da compra.
      </p>

      <h2>5. Acompanhamento</h2>
      <p>
        Você acompanha o status do pedido pela página do pedido, do recebimento à entrega concluída,
        passando pela confirmação do pagamento e pelo envio. As atualizações também são enviadas
        para o seu e-mail.
      </p>

      <h2>6. Endereço de entrega</h2>
      <p>
        Confira seus dados antes de finalizar o pedido. Em caso de endereço incorreto, incompleto ou
        ausência de recebedor, um novo envio pode ter custo adicional por conta do cliente.
      </p>

      <h2>Dúvidas</h2>
      <p>
        Fale com a gente pelo WhatsApp {siteConfig.whatsappLabel} ou por{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>
    </LegalPage>
  );
}
