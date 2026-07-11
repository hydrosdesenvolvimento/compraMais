import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Prefixos servidos pelo backend (rotas dos controllers Fastify). A SPA usa hash routing, então
 * estes caminhos só aparecem em chamadas fetch — o proxy os encaminha ao backend SEM reescrever
 * (mesmo papel do nginx em produção). Manter em sincronia com nginx.conf.
 */
const API_PREFIXES = [
  '/fornecedores', '/editais', '/documentos', '/contestacoes-cnae', '/auditoria',
  '/admin', '/gestao', '/titular', '/transparencia', '/auth', '/bloqueios',
  '/malotes', '/metrics', '/health', '/catalogos', '/permissoes',
];

const target = process.env.VITE_API_PROXY_TARGET ?? 'http://backend:3000';
const proxy = Object.fromEntries(API_PREFIXES.map((p) => [p, { target, changeOrigin: true }]));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Em dev, o Vite encaminha os prefixos de API ao backend (em prod, o nginx faz o mesmo).
    proxy,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
