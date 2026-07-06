import { Pool } from 'pg';
import type { AppConfig } from '../config/env.js';

/**
 * Pool de conexões PostgreSQL (recomendação do DBA p/ evitar exaustão sob a concorrência do Fastify).
 * Host padrão = nome do serviço `db` na rede do Compose/Swarm. Senha nunca hardcoded (env/secret).
 */
export function criarPool(cfg: AppConfig['database']): Pool {
  return new Pool({
    host: cfg.host,
    port: cfg.port,
    database: cfg.name,
    user: cfg.user,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    max: cfg.poolMax,
  });
}
