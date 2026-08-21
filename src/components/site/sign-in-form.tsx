"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/client";

/**
 * Fluxo de login SEM SENHA (OTP por e-mail), em dois passos:
 *   1) usuario digita o e-mail  -> signInWithOtp envia um codigo de 6 digitos
 *   2) usuario digita o codigo   -> verifyOtp valida e cria a sessao
 *
 * Decisoes de seguranca:
 * - A validacao aqui (Zod) e so UX. Quem de fato valida e-mail, expira o codigo
 *   e limita tentativas e o Supabase Auth no servidor.
 * - Mensagens de erro genericas: nao dizemos "e-mail nao existe" nem "codigo
 *   invalido vs expirado" de forma detalhada, pra nao virar oraculo de
 *   enumeracao de contas.
 * - O redirect pos-login passa por safeRedirectPath (anti open-redirect).
 */

const emailSchema = z.email({ message: "Digite um e-mail válido." });
const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: "O código tem 6 dígitos." });

type Step = "email" | "code";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get("next"));

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "E-mail inválido.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (otpError) {
      setError("Não foi possível enviar o código agora. Tente novamente em instantes.");
      return;
    }
    setEmail(parsed.data);
    setStep("code");
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Código inválido.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data,
      type: "email",
    });
    setLoading(false);

    if (verifyError) {
      setError("Código incorreto ou expirado. Confira ou peça um novo.");
      return;
    }

    // Sessao criada. router.refresh() força os Server Components (ex.: header)
    // a relerem o estado de login.
    router.replace(next);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Enviando…" : "Enviar código"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Sem senha: enviamos um código de 6 dígitos para o seu e-mail. Se ainda não tem conta, ela
          é criada automaticamente no primeiro acesso.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Enviamos um código de 6 dígitos para <span className="text-foreground">{email}</span>.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium">
          Código
        </label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? true : undefined}
          className="text-center text-xl tracking-[0.4em]"
          required
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? "Verificando…" : "Entrar"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setStep("email");
          setCode("");
          setError(null);
        }}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        ← Usar outro e-mail
      </button>
    </form>
  );
}
