import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig ("@/*" -> src/*).
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Roda em UTC, como o servidor da Vercel. Assim um teste que passa na sua
    // maquina (fuso de Brasilia) nao esconde um bug que so aparece em producao.
    env: { TZ: "UTC" },
  },
});
