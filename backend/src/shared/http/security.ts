import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

/**
 * Adaptador de segurança HTTP transversal (camada de infra/adapters). Mantém o hardening fora do
 * domínio e dos casos de uso (Clean Architecture / AD-32): cabeçalhos de segurança via `@fastify/helmet`
 * e CORS configurável por ambiente via `@fastify/cors` (origem em `CORS_ORIGIN`). É registrado no
 * composition root (`server.ts`), antes das rotas, para valer globalmente. AD-19 (guardrail) / AD-29.
 *
 * `app.register` é deferido pelo Fastify até `ready()`/`listen()`, então pode ser chamado de forma
 * síncrona (sem `await`) preservando a assinatura síncrona de `buildServer`.
 */
export function registrarSegurancaHttp(app: FastifyInstance): void {
  void app.register(helmet);
  void app.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' });
}
