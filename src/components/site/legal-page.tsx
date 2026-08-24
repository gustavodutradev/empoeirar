import type { ReactNode } from "react";

/**
 * Layout de pagina de texto longo (politicas e termos). Aplica tipografia
 * consistente aos filhos (h2/p/ul/a) via seletores utilitarios, sem depender
 * de plugin de typography.
 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-4xl text-primary">{title}</h1>
      {updatedAt ? (
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
      ) : null}
      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-foreground/80 [&_a]:text-primary [&_a]:underline [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-primary [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}
