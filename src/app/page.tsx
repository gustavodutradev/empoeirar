import { Button } from "@/components/ui/button";

/**
 * Placeholder da landing — existe para materializar a identidade (paleta +
 * tipografia + componentes) no Step 6. A landing real (quem somos, categorias,
 * FAQ, contato) e construida no Step 7 / Fase 1.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
      <section className="flex max-w-2xl flex-col items-center gap-6">
        {/* Motivo do catalogo: moldura circular com anel bege. */}
        <div className="flex size-24 items-center justify-center rounded-full border-4 border-secondary bg-card">
          <span className="font-display text-3xl text-primary">E</span>
        </div>

        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">@empoeirar</p>

        <h1 className="text-5xl leading-tight sm:text-6xl">Empoeirar</h1>

        <p className="text-lg leading-relaxed text-foreground/80">
          Moldes e ferramentas de madeira para ceramistas. Puxadores, conjuntos orgânicos, moldes
          geométricos e lúdicos, e peças especiais.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href="#catalogo">Ver o catálogo</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#personalizado">Um molde para chamar de seu!</a>
          </Button>
        </div>
      </section>

      {/* Amostra da paleta — apenas para conferir a identidade neste step. */}
      <section className="flex flex-wrap items-center justify-center gap-3">
        {[
          { nome: "creme", cls: "bg-background" },
          { nome: "bege", cls: "bg-secondary" },
          { nome: "ardósia", cls: "bg-primary" },
          { nome: "card", cls: "bg-card" },
        ].map((c) => (
          <div key={c.nome} className="flex flex-col items-center gap-1">
            <div className={`size-12 rounded-lg border ${c.cls}`} />
            <span className="text-xs text-muted-foreground">{c.nome}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
