import { describe, it, expect, afterEach } from 'vitest';
import { loadConfig } from '../../src/shared/config/env.js';

/**
 * AD-29 + AD-20: em produção o segredo do JWT vem do ambiente/Docker secret, nunca do repositório.
 *
 * Enquanto o RBAC autorizava por `x-papel`, o segredo default era só um cheiro ruim — o token não
 * decidia nada. Depois da Fase 2 o token É a autorização, então subir produção com o segredo de
 * desenvolvimento (que está versionado aqui) permitiria forjar um administrador e reabriria o
 * buraco por configuração. Estes casos garantem que isso falha no boot, alto e cedo.
 */
describe('segredo do JWT (AD-29)', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('produção sem JWT_SECRET → recusa subir', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_SECRET_FILE;

    expect(() => loadConfig()).toThrow(/JWT_SECRET is required in production/);
  });

  it('produção com o segredo de desenvolvimento → recusa subir', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'dev-secret-inseguro-trocar-em-producao';

    expect(() => loadConfig()).toThrow(/JWT_SECRET is required in production/);
  });

  it('produção com segredo próprio → sobe e usa o segredo do ambiente', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'um-segredo-de-verdade-vindo-do-ambiente';
    // Produção exige também a chave de PII (AD-19); satisfeita aqui para isolar o segredo do JWT.
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

    expect(loadConfig().auth.jwtSecret).toBe('um-segredo-de-verdade-vindo-do-ambiente');
  });

  it('desenvolvimento sem JWT_SECRET → sobe com o segredo de dev (não trava o time)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    expect(loadConfig().auth.jwtSecret).toBe('dev-secret-inseguro-trocar-em-producao');
  });
});
