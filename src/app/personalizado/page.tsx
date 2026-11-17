import { CustomRequestForm } from "@/components/site/custom-request-form";
import { noIndex } from "@/lib/metadata";

// Fora do Google até o Jane mandar o texto e as fotos definitivas da página.
// Quando chegarem: tirar o noIndex e incluir a página no sitemap.
export const metadata = { title: "Um molde para chamar de seu!", robots: noIndex };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl text-primary">Um molde para chamar de seu!</h1>
        <p className="text-lg leading-relaxed text-foreground/85">
          Precisa de um molde que não está no catálogo? Conte como ele é e mande fotos ou desenhos
          de referência. Respondemos com o orçamento e o prazo.
        </p>
      </div>
      <CustomRequestForm />
    </main>
  );
}
