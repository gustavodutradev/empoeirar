import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Como comprar",
  description:
    "Passo a passo para comprar na Empoeirar: do carrinho ao acompanhamento do pedido, com pagamento seguro pelo Mercado Pago.",
};

const steps: { title: string; body: ReactNode }[] = [
  {
    title: "Escolha seus moldes",
    body: (
      <>
        Navegue por{" "}
        <Link href="/produtos" className="text-primary underline">
          Produtos
        </Link>
        , veja fotos, medidas e variações, e adicione ao carrinho o que quiser. Você pode ajustar as
        quantidades no carrinho antes de finalizar.
      </>
    ),
  },
  {
    title: "Entre com seu e-mail",
    body: "Para finalizar, informe seu e-mail: enviamos um código de 6 dígitos para você confirmar. É só digitar o código — sem senha para criar nem lembrar.",
  },
  {
    title: "Informe os dados de entrega",
    body: "Preencha seu nome, CPF e endereço. Ao digitar o CEP, o restante do endereço é preenchido automaticamente. Com base nas dimensões e no peso das peças, calculamos as opções de frete e você escolhe a que preferir.",
  },
  {
    title: "Pague com segurança",
    body: "O pagamento é concluído pelo Mercado Pago: Pix, cartão de crédito ou boleto. Seus dados de cartão são processados diretamente pelo Mercado Pago e não passam pelo nosso site. O pedido é confirmado assim que o pagamento é aprovado.",
  },
  {
    title: "Acompanhe até a entrega",
    body: (
      <>
        Na página do seu pedido você acompanha a linha do tempo — do recebimento à entrega
        concluída, passando pela confirmação do pagamento e pelo envio. As atualizações também
        chegam no seu e-mail a cada etapa.
      </>
    ),
  },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="font-display text-4xl text-primary sm:text-5xl">Como comprar</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Comprar na Empoeirar é simples e seguro. Veja o passo a passo, do carrinho ao acompanhamento
        do pedido.
      </p>

      <ol className="mt-10 flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-xl border bg-card p-5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
              aria-hidden
            >
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium text-primary">{step.title}</h2>
              <p className="mt-1 leading-relaxed text-foreground/80">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl text-primary">Quer um molde exclusivo?</h2>
        <p className="mt-2 leading-relaxed text-foreground/80">
          Também criamos moldes personalizados, sob medida para a sua peça. Veja como em{" "}
          <Link href="/personalizado" className="text-primary underline">
            Um molde para chamar de seu
          </Link>
          .
        </p>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Ficou com dúvida? Consulte as{" "}
        <Link href="/faq" className="text-primary underline">
          perguntas frequentes
        </Link>{" "}
        ou fale com a gente pelo WhatsApp {siteConfig.whatsappLabel} ou por{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-primary underline">
          {siteConfig.email}
        </a>
        . Antes de finalizar, vale conferir a{" "}
        <Link href="/politica-envio" className="text-primary underline">
          Política de Envio
        </Link>{" "}
        e a{" "}
        <Link href="/trocas-devolucoes" className="text-primary underline">
          Política de Trocas e Devoluções
        </Link>
        .
      </p>
    </main>
  );
}
