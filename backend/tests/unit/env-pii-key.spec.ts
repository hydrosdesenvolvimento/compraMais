import { describe, it, expect, afterEach } from 'vitest';
import { randomBytes, createHash } from 'node:crypto';
import { loadConfig } from '../../src/shared/config/env.js';

/**
 * AD-29 + AD-19: em produção a chave de cifra de PII vem do ambiente/Docker secret, nunca do repo.
 *
 * Cifrar PII com uma chave que está derivada de um rótulo versionado aqui não protege ninguém — só
 * dá a aparência de proteção, o que é pior que não cifrar, porque cala o alarme. Como no `JWT_SECRET`
 * (AD-20), o processo morre no boot em vez de subir inseguro e silencioso.
 */
describe('chave de cifra de PII (AD-29)', () => {
  const original = { ...process.env };
  const CHAVE_DEV = createHash('sha256').update('dev-pii-key-inseguro-trocar-em-producao').digest();
  afterEach(() => {
    process.env = { ...original };
  });

  /** Produção exige também o `JWT_SECRET` (AD-20): satisfeito aqui para isolar a chave de PII. */
  const producaoComJwt = () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'um-segredo-de-verdade-vindo-do-ambiente';
  };

  it('produção sem PII_ENCRYPTION_KEY → recusa subir', () => {
    producaoComJwt();
    delete process.env.PII_ENCRYPTION_KEY;
    delete process.env.PII_ENCRYPTION_KEY_FILE;

    expect(() => loadConfig()).toThrow(/PII_ENCRYPTION_KEY is required in production/);
  });

  it('produção com a chave de desenvolvimento → recusa subir', () => {
    producaoComJwt();
    process.env.PII_ENCRYPTION_KEY = CHAVE_DEV.toString('base64');

    expect(() => loadConfig()).toThrow(/PII_ENCRYPTION_KEY is required in production/);
  });

  it('produção com chave própria em base64 → sobe e usa a chave do ambiente', () => {
    const chave = randomBytes(32);
    producaoComJwt();
    process.env.PII_ENCRYPTION_KEY = chave.toString('base64');

    expect(loadConfig().crypto.piiKey.equals(chave)).toBe(true);
  });

  it('chave em hex também é aceita (32 bytes = 64 caracteres)', () => {
    const chave = randomBytes(32);
    producaoComJwt();
    process.env.PII_ENCRYPTION_KEY = chave.toString('hex');

    expect(loadConfig().crypto.piiKey.equals(chave)).toBe(true);
  });

  it('chave do tamanho errado → erro claro, mesmo fora de produção', () => {
    process.env.NODE_ENV = 'development';
    process.env.PII_ENCRYPTION_KEY = randomBytes(16).toString('base64');

    expect(() => loadConfig()).toThrow(/must decode to 32 bytes/);
  });

  it('desenvolvimento sem PII_ENCRYPTION_KEY → sobe com a chave de dev (não trava o time)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PII_ENCRYPTION_KEY;

    expect(loadConfig().crypto.piiKey.equals(CHAVE_DEV)).toBe(true);
  });
});
