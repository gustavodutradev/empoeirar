import type { NextConfig } from "next";

// Valida as variaveis de ambiente no momento do build/start. Se algo estiver
// faltando ou invalido, o processo QUEBRA aqui — antes de virar bug em prod.
import "./src/env";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
