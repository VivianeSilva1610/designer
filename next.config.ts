import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // evita o aviso de "múltiplos lockfiles" (há um package-lock.json em D:\Projetos)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
