import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Imagem de produto. Se `src` for informado, renderiza a foto; caso contrario,
 * um placeholder na identidade do catalogo (moldura circular com anel bege).
 *
 * `src` vem do Storage (product_image) ou, para produto sem foto no banco, do
 * fallback em public/produtos.
 *
 * Usa next/image em modo `fill`: o tamanho vem do container (`className`, ex.:
 * aspect-square w-full) e a Vercel gera versoes menores da foto sob demanda.
 * `sizes` diz ao navegador que largura a imagem ocupa na tela; sem ele, o
 * navegador assume a tela inteira e baixa a versao grande mesmo num card de
 * 200px. Cada lugar que usa o componente informa o seu.
 */
export function ProductImage({
  name,
  src,
  className,
  sizes,
  priority = false,
}: {
  name: string;
  src?: string;
  className?: string;
  sizes: string;
  /** Foto principal acima da dobra (LCP): carrega já, com prioridade alta. */
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          className="object-cover"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      </div>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={cn("flex items-center justify-center bg-secondary/50", className)}>
      <div className="flex size-20 items-center justify-center rounded-full border-4 border-secondary bg-card">
        <span className="font-display text-2xl text-primary">{initial}</span>
      </div>
    </div>
  );
}
