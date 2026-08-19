import { LegalPage } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Termos e condições" };

export default function Page() {
  return (
    <LegalPage title="Termos e Condições de Uso" updatedAt="19 de agosto de 2026">
      <p>
        Estes Termos regem o uso do site da Empoeirar e a compra dos nossos produtos. Ao navegar ou
        fazer um pedido, você concorda com as condições abaixo.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        A Empoeirar produz moldes e ferramentas de madeira para ceramistas, feitos à mão, um a um.
        CNPJ: (a preencher). Contato: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>{" "}
        · WhatsApp {siteConfig.whatsappLabel} · Instagram {siteConfig.instagramHandle}.
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
        No momento, os pedidos são combinados pelo WhatsApp ou pelo direct do Instagram, com
        pagamento via Pix ou dinheiro, podendo ser solicitado um sinal e o restante na entrega ou no
        envio. Em breve, o site contará com carrinho e checkout próprios, com pagamento por Pix,
        cartão e boleto.
      </p>

      <h2>6. Entrega</h2>
      <p>
        A entrega pode ser gratuita para Belo Horizonte – MG (a confirmar). Para as demais
        localidades, o frete é estimado no momento da compra. Consulte a{" "}
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
