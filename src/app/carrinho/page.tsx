import { CartView } from "@/components/site/cart-view";

export const metadata = { title: "Carrinho" };

export default function CarrinhoPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-3xl text-primary sm:text-4xl">Carrinho</h1>
      <div className="mt-4 sm:mt-8">
        <CartView />
      </div>
    </main>
  );
}
