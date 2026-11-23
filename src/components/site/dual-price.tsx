import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Preço no Pix (em destaque) e no cartão. Sem hooks: serve em componente de
 * servidor e de cliente.
 */
export function DualPrice({
  pixCents,
  cardCents,
  size = "md",
  prefix,
  className,
}: {
  pixCents: number;
  cardCents: number;
  size?: "sm" | "md" | "lg";
  /** Ex.: "a partir de". */
  prefix?: string;
  className?: string;
}) {
  const main = { sm: "text-base", md: "text-lg", lg: "text-3xl" }[size];
  const sub = size === "lg" ? "text-base" : "text-sm";
  return (
    <span className={cn("flex flex-col", className)}>
      <span className={cn("tabular-nums text-foreground", main)}>
        {prefix ? <span className="text-muted-foreground text-[0.8em]">{prefix} </span> : null}
        {formatBRL(pixCents)} <span className="text-[0.7em] text-muted-foreground">no Pix</span>
      </span>
      {cardCents !== pixCents ? (
        <span className={cn("tabular-nums text-muted-foreground", sub)}>
          ou {formatBRL(cardCents)} no cartão
        </span>
      ) : (
        <span className={cn("text-muted-foreground", sub)}>mesmo valor no cartão</span>
      )}
    </span>
  );
}
