import { LegalPage } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Trocas e devoluções" };

export default function Page() {
  return (
    <LegalPage title="Trocas e Devoluções" updatedAt="29 de agosto de 2026">
      <p>
        Na Empoeirar, cada peça é feita à mão, com cuidado. Ainda assim, se algo não sair como o
        esperado, esta política explica como solicitar troca ou devolução, em conformidade com o
        Código de Defesa do Consumidor (CDC).
      </p>

      <h2>1. Prazos para solicitação</h2>
      <ul>
        <li>
          <strong>Arrependimento:</strong> até 7 dias corridos após o recebimento do produto,
          conforme o direito de arrependimento previsto no art. 49 do CDC, sem necessidade de
          justificativa.
        </li>
        <li>
          <strong>Defeito ou dano no transporte:</strong> até 7 dias corridos após o recebimento,
          quando constatado defeito de fabricação ou dano ocorrido na entrega.
        </li>
      </ul>

      <h2>2. Como solicitar</h2>
      <p>
        Entre em contato pelo WhatsApp {siteConfig.whatsappLabel} ou pelo e-mail{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>, dentro do prazo, informando o
        número do pedido, seu nome completo e o motivo da solicitação. Em caso de defeito ou dano,
        envie também fotos ou vídeos que comprovem o problema.
      </p>

      <h2>3. Condições para devolução por arrependimento</h2>
      <p>Para o reembolso por arrependimento, o produto deve retornar:</p>
      <ul>
        <li>sem sinais de uso;</li>
        <li>com a embalagem original preservada;</li>
        <li>com todos os itens e acessórios que o acompanham.</li>
      </ul>

      <h2>4. Defeito ou dano</h2>
      <p>
        Produtos com defeito de fabricação ou danificados no transporte serão avaliados a partir das
        fotos/vídeos enviados e da descrição do ocorrido. Peças com sinais de mau uso, danos
        causados após o recebimento ou alterações feitas pelo cliente não são elegíveis para troca
        ou devolução.
      </p>

      <h2>5. Custos de frete</h2>
      <p>
        <strong>A Empoeirar arca com o frete quando:</strong>
      </p>
      <ul>
        <li>houver defeito de fabricação confirmado;</li>
        <li>houver dano no transporte comunicado dentro do prazo;</li>
        <li>
          for exercido o direito de arrependimento (nesse caso, o frete de devolução é por conta do
          vendedor, conforme o CDC).
        </li>
      </ul>
      <p>
        <strong>O cliente arca com o frete quando:</strong>
      </p>
      <ul>
        <li>solicitar troca voluntária por cortesia, fora das hipóteses previstas em lei;</li>
        <li>for necessário reenvio por endereço incorreto, incompleto ou ausência de recebedor.</li>
      </ul>

      <h2>6. Produtos personalizados</h2>
      <p>
        Moldes personalizados ou feitos sob medida são produzidos exclusivamente para você e, por
        isso, não estão sujeitos ao direito de arrependimento — exceto em caso de defeito de
        fabricação.
      </p>

      <h2>7. Análise da solicitação</h2>
      <p>
        Após recebermos as informações, a análise é feita em até 3 dias úteis. Se aprovada, você
        recebe as orientações de envio.
      </p>

      <h2>8. Reembolso</h2>
      <p>
        O reembolso é processado somente após o recebimento e a verificação da integridade do
        produto. Pagamentos em cartão têm o estorno solicitado à operadora; pagamentos via Pix são
        devolvidos na conta informada. O prazo de processamento é de até 10 dias úteis após a
        confirmação da devolução.
      </p>

      <h2>9. Substituição (em caso de defeito)</h2>
      <p>
        Confirmado o defeito, o produto poderá ser substituído por outro igual. Caso não haja
        disponibilidade, você poderá escolher outro item de igual valor ou solicitar o reembolso.
      </p>

      <h2>Dúvidas</h2>
      <p>
        Fale com a gente pelo WhatsApp {siteConfig.whatsappLabel} ou por{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>
    </LegalPage>
  );
}
