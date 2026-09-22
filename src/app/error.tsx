"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/error-screen";
import { Button } from "@/components/ui/button";

/**
 * Error boundary das páginas. Pega erros de render e de Server Components
 * abaixo do root layout; header e footer continuam na tela. Erros no próprio
 * root layout caem no global-error.tsx.
 *
 * `retry` (estável desde o Next 16.3) busca de novo os dados do segmento e
 * re-renderiza. É o que resolve falha transitória (Supabase fora do ar por
 * alguns segundos). O antigo `reset` só re-renderiza, sem buscar de novo.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Em produção o Next troca a mensagem de erros de servidor por uma genérica,
    // então isto não expõe detalhes internos. Item 42: enviar ao monitoramento.
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      eyebrow="Algo deu errado"
      title="Não conseguimos carregar esta página"
      description="O problema foi do nosso lado. Tente de novo em alguns instantes; se continuar, fale com a gente."
      digest={error.digest}
    >
      <Button type="button" size="lg" onClick={() => retry()}>
        Tentar de novo
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorScreen>
  );
}
