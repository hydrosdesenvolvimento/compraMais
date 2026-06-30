import { readFileSync } from 'node:fs';

/**
 * Leitura e validacao de variaveis de ambiente na borda de inicializacao.
 *
 * Suporta o padrao `*_FILE` usado por Docker secrets em producao
 * (PRJ-DEC-07 / plano do DBA): quando `<VAR>_FILE` estiver definido, o valor
 * e lido do arquivo apontado (ex.: /run/secrets/db_password) em vez de
 * `<VAR>` em texto. Nenhum segredo e versionado ou hardcoded.
 */
function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    return readFileSync(filePath, 'utf8').trim();
  }
  return process.env[name];
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface AppConfig {
  nodeEnv: string;
  host: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string | undefined;
    ssl: boolean;
    poolMax: number;
  };
  corsOrigin: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '0.0.0.0',
    port: toInt(process.env.PORT, 3000),
    database: {
      host: process.env.POSTGRES_HOST ?? 'db',
      port: toInt(process.env.POSTGRES_PORT, 5432),
      name: process.env.POSTGRES_DB ?? 'compramais',
      user: process.env.POSTGRES_USER ?? 'compramais',
      // Senha vem de POSTGRES_PASSWORD (dev/.env) ou POSTGRES_PASSWORD_FILE (Docker secret, prod).
      password: readSecret('POSTGRES_PASSWORD'),
      ssl: (process.env.POSTGRES_SSL ?? 'false') === 'true',
      poolMax: toInt(process.env.POSTGRES_POOL_MAX, 10),
    },
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  };
}
