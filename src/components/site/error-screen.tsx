import type { ReactNode } from "react";

/**
 * Casca visual comum das telas de erro (404, erro de rota e erro global).
 * Sem hooks e sem "use client": serve tanto ao not-found (Server Component)
 * quanto aos error boundaries (Client Components) que a importam.
 *
 * Nunca recebe a mensagem do erro. Só o `digest`, um hash que o Next gera para
 * erros de servidor: não revela nada ao visitante e permite achar o log certo
 * quando alguém reportar o problema.
 */
export function ErrorScreen({
  eyebrow,
  title,
  description,
  digest,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  digest?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center sm:px-6 sm:py-24">
      <p className="text-sm uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{children}</div>
      {digest ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Código para suporte: <span className="font-mono">{digest}</span>
        </p>
      ) : null}
    </main>
  );
}
