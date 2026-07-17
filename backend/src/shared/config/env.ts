import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TAMANHO_CHAVE_PII } from '../crypto/pii-cipher-aes.js';

/**
 * Configuração na borda de inicialização. Suporta o padrão `*_FILE` dos Docker secrets (AD-29 /
 * PRJ-DEC-07): se `<VAR>_FILE` existir, lê o valor do arquivo (ex.: /run/secrets/jwt_secret) em vez
 * de `<VAR>` em texto. Nenhum segredo é versionado ou hardcoded.
 */
function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) return readFileSync(filePath, 'utf8').trim();
  return process.env[name];
}
function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

export interface GoogleConfig { clientId: string; clientSecret: string; callbackUrl: string }

export interface AppConfig {
  nodeEnv: string;
  database: { host: string; port: number; name: string; user: string; password: string | undefined; ssl: boolean; poolMax: number };
  auth: {
    jwtSecret: string;
    jwtExpiraEmSeg: number;
    google?: GoogleConfig;
    frontendRedirect: string;
  };
  crypto: { piiKey: Buffer };
}

/** Segredo de assinatura usado fora de produção, quando `JWT_SECRET` não foi informado. */
const SEGREDO_DEV = 'dev-secret-inseguro-trocar-em-producao';

/**
 * Resolve o segredo do JWT, e em produção EXIGE que ele venha do ambiente (AD-29).
 *
 * Antes do AD-20 o token era decorativo — quem autorizava era o header `x-papel` — e um segredo
 * default era só um cheiro ruim. Agora o token É a autorização: subir produção sem `JWT_SECRET`
 * significa assinar com um segredo que está neste repositório público, e qualquer pessoa forja um
 * token de administrador. Isso reabriria, por configuração, exatamente o buraco que a Fase 2
 * fechou — então aqui o processo morre no boot em vez de subir inseguro e silencioso.
 */
function exigirSegredoJwt(nodeEnv: string): string {
  const segredo = readSecret('JWT_SECRET');
  if (segredo && segredo !== SEGREDO_DEV) return segredo;
  if (nodeEnv === 'production') {
    throw new Error(
      'JWT_SECRET is required in production: set it via environment or Docker secret (JWT_SECRET_FILE). ' +
        'Refusing to sign tokens with the development secret.',
    );
  }
  return SEGREDO_DEV;
}

/**
 * Chave de PII usada fora de produção, quando `PII_ENCRYPTION_KEY` não foi informada. Derivada de um
 * rótulo fixo e versionado — é DE DESENVOLVIMENTO: pública, portanto não protege nada.
 */
const CHAVE_PII_DEV = createHash('sha256').update('dev-pii-key-inseguro-trocar-em-producao').digest();

/**
 * Decodifica a chave em base64 ou hex, exigindo os 32 bytes do AES-256. Hex primeiro: 64 caracteres
 * hexadecimais também são base64 válido (decodificariam para 48 bytes silenciosamente), então a
 * forma mais específica desempata.
 */
function decodificarChavePii(bruta: string): Buffer {
  const texto = bruta.trim();
  const chave = /^[0-9a-fA-F]{64}$/.test(texto) ? Buffer.from(texto, 'hex') : Buffer.from(texto, 'base64');
  if (chave.length !== TAMANHO_CHAVE_PII) {
    throw new Error(
      `PII_ENCRYPTION_KEY must decode to ${TAMANHO_CHAVE_PII} bytes (256 bits) from base64 or hex, got ${chave.length}.`,
    );
  }
  return chave;
}

/**
 * Resolve a chave de cifra de PII, e em produção EXIGE que ela venha do ambiente (AD-29).
 *
 * Cifrar PII em repouso só protege o dado se a chave for secreta. Subir produção com a chave de
 * desenvolvimento — que está derivada de um rótulo neste repositório — significa que qualquer pessoa
 * decifra os documentos dos fornecedores: a cifra vira teatro, e um teatro pior que nada, porque
 * passaria a impressão de que o dado está protegido. Então o processo morre no boot.
 */
function exigirChavePii(nodeEnv: string): Buffer {
  const bruta = readSecret('PII_ENCRYPTION_KEY');
  if (bruta) {
    const chave = decodificarChavePii(bruta);
    if (!chave.equals(CHAVE_PII_DEV)) return chave;
  }
  if (nodeEnv === 'production') {
    throw new Error(
      'PII_ENCRYPTION_KEY is required in production: set it via environment or Docker secret ' +
        '(PII_ENCRYPTION_KEY_FILE), as 32 bytes in base64 or hex. ' +
        'Refusing to encrypt PII with the development key.',
    );
  }
  return CHAVE_PII_DEV;
}

/** Verdadeiro quando há Postgres configurado por ambiente (decide repo pg vs memória). */
export function temPostgresConfigurado(): boolean {
  return Boolean(process.env.POSTGRES_HOST ?? process.env.DATABASE_URL);
}

export function loadConfig(): AppConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = readSecret('GOOGLE_CLIENT_SECRET');
  const google: GoogleConfig | undefined = clientId && clientSecret
    ? { clientId, clientSecret, callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/auth/google/callback' }
    : undefined;

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      host: process.env.POSTGRES_HOST ?? 'db',
      port: toInt(process.env.POSTGRES_PORT, 5432),
      name: process.env.POSTGRES_DB ?? 'compramais',
      user: process.env.POSTGRES_USER ?? 'compramais',
      password: readSecret('POSTGRES_PASSWORD'),
      ssl: (process.env.POSTGRES_SSL ?? 'false') === 'true',
      poolMax: toInt(process.env.POSTGRES_POOL_MAX, 10),
    },
    auth: {
      jwtSecret: exigirSegredoJwt(process.env.NODE_ENV ?? 'development'),
      jwtExpiraEmSeg: toInt(process.env.JWT_EXPIRES_IN_SECONDS, 3600),
      ...(google ? { google } : {}),
      frontendRedirect: process.env.AUTH_FRONTEND_REDIRECT ?? 'http://localhost:5173/#/cadastro',
    },
    crypto: { piiKey: exigirChavePii(process.env.NODE_ENV ?? 'development') },
  };
}
