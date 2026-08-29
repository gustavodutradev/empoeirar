import { LegalPage } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Termos e condições" };

export default function Page() {
  return (
    <LegalPage title="Termos e Condições de Uso" updatedAt="29 de agosto de 2026">
      <p>
        Estes Termos regem o uso do site da Empoeirar e a compra dos nossos produtos. Ao navegar ou
        fazer um pedido, você concorda com as condições abaixo.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        A Empoeirar é a marca de {siteConfig.legalName} (microempreendedor individual — MEI), CNPJ{" "}
        {siteConfig.cnpj}, com sede em {siteConfig.city}. Produzimos moldes e ferramentas de madeira
        para ceramistas, feitos à mão, um a um. Contato:{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> · WhatsApp{" "}
        {siteConfig.whatsappLabel} · Instagram {siteConfig.instagramHandle}.
      </p>

      <h2>2. Produtos artesanais</h2>
      <p>
        Nossos moldes são feitos à mão em MDF, desde o desenho e o corte até o acabamento das bordas
        e o entalhe dos puxadores. Assim como na cerâmica, cada peça é única: pequenas variações de
        cor, textura e medida são naturais do processo artesanal e não constituem defeito.
      </p>

      <h2>3. Preços e disponibilidade</h2>
      <p>
        Os preços são expressos em reais (R$) e podem ser alterados sem aviso prévio. Muitas peças
        são produzidas sob demanda; a disponibilidade é confirmada no momento do pedido.
      </p>

      <h2>4. Prazo de produção</h2>
      <p>
        Peças em pronta entrega são despachadas antes; itens produzidos sob demanda têm prazo de até
        10 dias para produção, após a confirmação do pedido. Eventuais alterações no prazo são
        comunicadas a você.
      </p>

      <h2>5. Pedidos e pagamento</h2>
      <p>
        Os pedidos são feitos pelo site: você adiciona os itens ao carrinho, informa os dados de
        entrega e conclui o pagamento pelo Mercado Pago (Pix, cartão de crédito ou boleto). O pedido
        é confirmado após a aprovação do pagamento, e você acompanha o andamento pela página do
        pedido. Personalizações e dúvidas também podem ser combinadas pelo WhatsApp ou pelo direct
        do Instagram.
      </p>

      <h2>6. Entrega</h2>
      <p>
        Enviamos para todo o Brasil por transportadora. O frete é calculado e exibido no momento da
        compra, conforme o CEP de destino. Consulte a{" "}
        <a href="/politica-envio">Política de Envio</a> e a{" "}
        <a href="/trocas-devolucoes">Política de Trocas e Devoluções</a>.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A marca Empoeirar, os textos, as imagens e o design dos moldes são de titularidade da
        Empoeirar. É vedada a reprodução, cópia ou uso comercial sem autorização.
      </p>

      <h2>8. Uso do site</h2>
      <p>
        Você concorda em não utilizar o site para fins ilícitos nem em tentar comprometer sua
        segurança ou disponibilidade.
      </p>

      <h2>9. Limitação de responsabilidade</h2>
      <p>
        Nos limites permitidos pela lei, a Empoeirar não se responsabiliza por danos decorrentes do
        uso indevido dos produtos ou do site.
      </p>

      <h2>10. Legislação e foro</h2>
      <p>
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do
        consumidor para dirimir eventuais controvérsias, conforme o CDC.
      </p>

      <h2>11. Alterações</h2>
      <p>
        Podemos atualizar estes Termos periodicamente. A versão vigente estará sempre disponível
        nesta página.
      </p>
    </LegalPage>
  );
}
