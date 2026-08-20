import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Perguntas frequentes",
  description: "Dúvidas comuns sobre os moldes, prazos, entrega e pedidos da Empoeirar.",
};

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "Do que são feitos os moldes?",
    a: "Os moldes são feitos à mão em MDF de 18 mm. As ferramentas (como os discos para torno) usam MDF naval, resistente à água.",
  },
  {
    q: "Para que servem os puxadores?",
    a: "Os puxadores entalhados têm o formato perfeito para encaixar os dedos e segurar o molde com firmeza. Assim você separa o molde da argila sem forçar e sem danificar a borda da peça.",
  },
  {
    q: "Qual é o prazo de produção e entrega?",
    a: "Peças em pronta entrega são despachadas primeiro. Itens produzidos sob demanda têm prazo de até 10 dias de produção, mais o tempo de transporte estimado pela transportadora.",
  },
  {
    q: "Vocês entregam para todo o Brasil?",
    a: "Sim. Em Belo Horizonte há entrega local (que pode ser gratuita, a confirmar). Para as demais localidades, o envio é por transportadora, com frete estimado no momento da compra.",
  },
  {
    q: "Como faço um pedido?",
    a: (
      <>
        No momento, os pedidos são combinados pelo WhatsApp {siteConfig.whatsappLabel} ou pelo
        direct do Instagram {siteConfig.instagramHandle}, com pagamento via Pix ou dinheiro. Em
        breve, o site terá carrinho e checkout próprios.
      </>
    ),
  },
  {
    q: "Vocês fazem moldes personalizados?",
    a: (
      <>
        Fazemos! Desenhe, fotografe ou descreva a forma que você quer e criamos um molde exclusivo.
        Saiba mais em{" "}
        <Link href="/personalizado" className="text-primary underline">
          Um molde para chamar de seu
        </Link>
        .
      </>
    ),
  },
  {
    q: "Como cuido dos moldes?",
    a: "Mantenha os moldes em local seco e limpe com um pano levemente úmido, sem imergir em água. As ferramentas de MDF naval resistem à água, mas o ideal é secá-las após o uso.",
  },
  {
    q: "Posso trocar ou devolver um produto?",
    a: (
      <>
        Sim. Veja os prazos e condições na nossa{" "}
        <Link href="/trocas-devolucoes" className="text-primary underline">
          Política de Trocas e Devoluções
        </Link>
        .
      </>
    ),
  },
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <h1 className="font-display text-4xl text-primary sm:text-5xl">Perguntas frequentes</h1>

      <div className="mt-8 flex flex-col gap-3">
        {faqs.map((item) => (
          <details key={item.q} className="group rounded-xl border bg-card p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-primary [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-3 leading-relaxed text-foreground/80">{item.a}</div>
          </details>
        ))}
      </div>
    </main>
  );
}
