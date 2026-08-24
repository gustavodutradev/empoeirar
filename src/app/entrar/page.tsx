import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/site/sign-in-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta Empoeirar com um código enviado ao seu e-mail.",
};

export default function EntrarPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl text-primary">Entrar</h1>
        <p className="mt-2 text-muted-foreground">Acesse sua conta para acompanhar seus pedidos.</p>
      </div>

      {/* useSearchParams (o `next`) exige um limite de Suspense no App Router. */}
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
