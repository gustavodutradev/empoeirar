import { LegalPage } from "@/components/site/legal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata = { title: "Política de privacidade" };

export default function Page() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="29 de agosto de 2026">
      <p>
        Esta Política descreve como a Empoeirar coleta, usa, compartilha e protege seus dados
        pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        Ao usar nosso site, você concorda com as práticas aqui descritas.
      </p>

      <h2>Controlador dos dados</h2>
      <p>
        {siteConfig.legalName} (MEI) — Empoeirar, CNPJ {siteConfig.cnpj}, {siteConfig.city}.
        Encarregado/contato para assuntos de privacidade:{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> · WhatsApp{" "}
        {siteConfig.whatsappLabel}.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Cadastro e contato:</strong> nome, e-mail, telefone e, quando aplicável, dados
          para emissão e entrega do pedido;
        </li>
        <li>
          <strong>Endereço de entrega:</strong> para cálculo de frete e envio;
        </li>
        <li>
          <strong>Dados de navegação:</strong> endereço IP, dispositivo, páginas visitadas e
          informações coletadas por cookies;
        </li>
        <li>
          <strong>Comunicações:</strong> mensagens que você nos envia por formulário, e-mail ou
          WhatsApp.
        </li>
      </ul>
      <p>Não coletamos dados pessoais sensíveis.</p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>viabilizar e processar seus pedidos;</li>
        <li>realizar a entrega e permitir o acompanhamento;</li>
        <li>prestar atendimento e suporte;</li>
        <li>cumprir obrigações legais e fiscais;</li>
        <li>com o seu consentimento, enviar novidades e comunicações sobre produtos.</li>
      </ul>

      <h2>3. Bases legais</h2>
      <p>
        Tratamos seus dados com base na execução do contrato de compra, no cumprimento de obrigação
        legal, no legítimo interesse (segurança e melhoria do serviço) e no seu consentimento
        (comunicações de marketing), conforme o art. 7º da LGPD.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Não vendemos seus dados. Compartilhamos apenas o necessário com prestadores que nos ajudam a
        operar:
      </p>
      <ul>
        <li>hospedagem da aplicação (Vercel) e banco de dados (Supabase);</li>
        <li>meio de pagamento (Mercado Pago), para processar pagamentos;</li>
        <li>cálculo de frete e transportadoras (Melhor Envio), para cotar e despachar o pedido;</li>
        <li>envio de e-mails transacionais (Google / Gmail).</li>
      </ul>
      <p>
        Também podemos compartilhar dados para cumprir a lei, atender a autoridades competentes ou
        proteger direitos, sempre nos limites da LGPD.
      </p>

      <h2>5. Transferência internacional</h2>
      <p>
        Os dados de conta e de pedidos ficam armazenados em banco de dados no Brasil (São Paulo).
        Alguns prestadores — como a hospedagem da aplicação e o envio de e-mails — podem processar
        dados em servidores fora do Brasil. Nesses casos, adotamos salvaguardas para garantir
        proteção equivalente à da legislação brasileira.
      </p>

      <h2>6. Cookies e armazenamento local</h2>
      <p>
        Usamos apenas cookies e armazenamento local <strong>essenciais</strong> para o funcionamento
        do site: manter você logado (sessão) e guardar os itens do seu carrinho. Não usamos cookies
        de publicidade. Caso venhamos a adotar ferramentas de análise de uso, esta Política será
        atualizada antes.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados, como conexão
        criptografada, armazenamento de senhas de forma cifrada e controle de acesso. Nenhum sistema
        é 100% seguro, mas trabalhamos continuamente para reduzir riscos.
      </p>

      <h2>8. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados pelo tempo necessário às finalidades desta Política e ao cumprimento de
        obrigações legais e fiscais; depois disso, são eliminados ou anonimizados.
      </p>

      <h2>9. Seus direitos</h2>
      <p>Nos termos do art. 18 da LGPD, você pode solicitar:</p>
      <ul>
        <li>confirmação da existência de tratamento e acesso aos dados;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>portabilidade a outro fornecedor;</li>
        <li>eliminação dos dados tratados com base no consentimento;</li>
        <li>informação sobre com quem compartilhamos seus dados;</li>
        <li>revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer seus direitos, escreva para{" "}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>

      <h2>10. Menores de idade</h2>
      <p>
        O site não é destinado a menores de 18 anos, e pedimos que não nos forneçam dados pessoais.
      </p>

      <h2>11. Alterações</h2>
      <p>
        Podemos atualizar esta Política periodicamente. A versão mais recente estará sempre
        disponível nesta página.
      </p>
    </LegalPage>
  );
}
