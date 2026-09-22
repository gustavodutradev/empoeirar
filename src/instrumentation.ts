import type { Instrumentation } from "next";

/**
 * Chamado pelo Next para todo erro não tratado no servidor: Server Components,
 * Route Handlers, Server Actions e middleware. Erros que o próprio código já
 * captura (try/catch que devolve mensagem amigável) NÃO passam por aqui; esses
 * chamam reportError diretamente.
 *
 * Não usamos `request.headers`: eles trazem cookies de sessão. Só método e
 * caminho, sem query string.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // nodemailer e o cliente admin do Supabase só rodam no runtime Node. No Edge
  // (middleware), fica só o log.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    console.error(
      "[onRequestError:edge]",
      context.routePath,
      err instanceof Error ? err.message : err,
    );
    return;
  }

  const [{ reportError }, { stripQuery }] = await Promise.all([
    import("@/lib/monitoring/report"),
    import("@/lib/monitoring/format"),
  ]);

  await reportError(`${context.routeType} ${context.routePath}`, err, {
    metodo: request.method,
    caminho: stripQuery(request.path),
    origem: context.renderSource,
  });
};
