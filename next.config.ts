import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // La interfaz es una SPA: la página carga el inbox solo en el cliente.
  images: { unoptimized: true },
};

export default nextConfig;
