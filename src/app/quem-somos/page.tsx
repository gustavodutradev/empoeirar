import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: "Quem somos",
  description:
    "A Empoeirar produz moldes e ferramentas de madeira para ceramistas, feitos à mão, um a um, em MDF.",
};

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Quem somos</p>
      <h1 className="mt-2 font-display text-4xl text-primary sm:text-5xl">
        Feitos à mão, um a um.
      </h1>

      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-foreground/80">
        <p>
          A Empoeirar nasceu para facilitar a vida de quem faz cerâmica. Produzimos moldes e
          ferramentas de madeira pensados no dia a dia do ateliê — do hobbista ao ceramista
          experiente.
        </p>
        <p>
          Cada peça é feita à mão, uma a uma, em MDF: do desenho no material ao corte, ao acabamento
          das bordas e ao entalhe dos puxadores. Assim como na cerâmica, nenhuma peça é exatamente
          igual à outra — e é isso que gostamos.
        </p>

        <h2 className="mt-6 font-display text-2xl text-primary">O detalhe que muda tudo</h2>
        <p>
          Nossos moldes têm puxadores entalhados no formato perfeito para encaixar os dedos e
          segurar com firmeza. Na hora de separar o molde da argila, isso faz toda a diferença: você
          desmolda sem forçar e sem danificar a borda das suas peças.
        </p>

        <h2 className="mt-6 font-display text-2xl text-primary">Uma homenagem ao Jequitinhonha</h2>
        <p>
          Você vai notar que os conjuntos de moldes orgânicos levam nomes como Turmalina, Padre
          Paraíso, Joaíma e Araçuaí. Todos são nomes de cidades e distritos do Vale do
          Jequitinhonha, referência em produção de artesanato e, principalmente, de cerâmica. Uma
          homenagem mais que merecida.
        </p>

        <h2 className="mt-6 font-display text-2xl text-primary">Um molde para chamar de seu</h2>
        <p>
          Além dos formatos clássicos, temos o maior prazer em transformar a sua imaginação em
          realidade. Desenhe, fotografe ou descreva a forma que você quer, e a gente cria um molde
          único e exclusivo para a sua coleção.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Empoeirar — moldes e ferramentas para ceramistas, por Bruno Mendes Haerdy. Instagram{" "}
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {siteConfig.instagramHandle}
          </a>
          .
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/produtos">Ver os produtos</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/personalizado">Encomendar um molde personalizado</Link>
        </Button>
      </div>
    </main>
  );
}
