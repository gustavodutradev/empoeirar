import Link from "next/link";

export function CategoryCard({
  name,
  description,
  href,
  cta = "Ver moldes",
}: {
  name: string;
  description: string | null;
  href: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border bg-card p-6 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <h3 className="font-display text-xl text-primary">{name}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <span className="mt-2 text-sm text-primary/80 group-hover:underline">{cta} →</span>
    </Link>
  );
}
