/**
 * Placeholder reutilizavel para paginas ainda sem conteudo definitivo
 * (institucionais e legais). O conteudo real e escrito depois, com os dados
 * oficiais do Empoeirar e revisao.
 */
export function PagePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl">{title}</h1>
      <p className="max-w-md text-muted-foreground">
        {description ?? "Esta página está em construção e será publicada em breve."}
      </p>
    </main>
  );
}
