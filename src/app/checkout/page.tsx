import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/site/checkout-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Finalizar compra" };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Checkout exige login. Guarda no servidor (nao basta esconder o botao).
  if (!user) {
    redirect("/entrar?next=/checkout");
  }

  // Prefill: dados que o cliente já salvou numa compra anterior. RLS garante
  // que só lemos o profile do próprio usuário.
  const { data: profile } = await supabase
    .from("profile")
    .select("full_name, phone, cpf")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-3xl text-primary sm:text-4xl">Finalizar compra</h1>
      <p className="mt-2 text-muted-foreground">
        Confirme seus dados e o endereço de entrega para criar o pedido.
      </p>

      <div className="mt-6 sm:mt-8">
        <CheckoutForm
          prefill={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            cpf: profile?.cpf ?? "",
            email: user.email ?? "",
          }}
        />
      </div>
    </main>
  );
}
