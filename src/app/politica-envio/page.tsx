import { LegalPage } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Política de envio" };

export default function Page() {
  return (
    <LegalPage title="Política de Envio" updatedAt="19 de agosto de 2026">
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
      <ul>
        <li>
          <strong>Belo Horizonte – MG:</strong> entrega local, que pode ser gratuita (a confirmar);
        </li>
        <li>
          <strong>Demais localidades do Brasil:</strong> envio por transportadora, com frete
          estimado no momento da compra.
        </li>
      </ul>

      <h2>3. Prazo de transporte</h2>
      <p>
        Após a postagem, o prazo de entrega é o estimado pela transportadora no momento da compra e
        não depende da Empoeirar. Contratempos logísticos da transportadora podem afetar a data
        final.
      </p>

      <h2>4. Frete</h2>
      <p>
        O valor do frete é calculado e exibido no momento da compra, conforme o CEP de destino. Para
        Belo Horizonte, consulte as condições de entrega local.
      </p>

      <h2>5. Acompanhamento</h2>
      <p>
        Quando o envio pelo site estiver disponível, você poderá acompanhar o status do pedido, do
        início da produção até a entrega concluída.
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
