import type { Metadata } from "next";
import Link from "next/link";
import { ErrorScreen } from "@/components/site/error-screen";
import { Button } from "@/components/ui/button";

// O Next já injeta <meta name="robots" content="noindex"> nas respostas 404.
export const metadata: Metadata = { title: "Página não encontrada" };

/**
 * 404 global: URLs sem rota e qualquer notFound() chamado nas páginas
 * (produto inexistente, pedido de outro usuário etc.). Renderiza dentro do
 * root layout, então header, footer e carrinho continuam disponíveis.
 */
export default function NotFound() {
  return (
    <ErrorScreen
      eyebrow="Erro 404"
      title="Página não encontrada"
      description="O endereço pode ter mudado ou a página não existe mais. Que tal dar uma olhada nos nossos moldes?"
    >
      <Button asChild size="lg">
        <Link href="/produtos">Ver os produtos</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </ErrorScreen>
  );
}
