"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/error-screen";
import { Button } from "@/components/ui/button";
import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * Último recurso: erro no próprio root layout (header, footer, CartSync).
 * Substitui o layout inteiro, por isso monta <html>/<body> e importa CSS e
 * fontes por conta própria. Não aceita `metadata` (é Client Component); o
 * título vai no <title> do React 19.
 *
 * O link de volta é <a> e não <Link>: se o layout quebrou, uma navegação
 * completa (recarregando tudo) tem mais chance de recuperar do que uma
 * navegação client-side reaproveitando o estado que falhou.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Algo deu errado · Empoeirar</title>
        <ErrorScreen
          eyebrow="Algo deu errado"
          title="O site está com um problema"
          description="O problema foi do nosso lado. Tente de novo em alguns instantes."
          digest={error.digest}
        >
          <Button type="button" size="lg" onClick={() => retry()}>
            Tentar de novo
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="/">Voltar ao início</a>
          </Button>
        </ErrorScreen>
      </body>
    </html>
  );
}
