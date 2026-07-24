import { describe, it, expect, afterEach } from 'vitest';
import { loadConfig } from '../../src/shared/config/env.js';

/**
 * Motor facial (UC007). O knob FACE_PROVIDER escolhe entre o serviço Python real (`insightface`) e o
 * mock determinístico; o default é seguro por ambiente (prod usa o real, dev/test caem no mock para
 * não exigir o container pesado). O limiar de cosseno é sobreponível para calibração.
 */
describe('config do reconhecimento facial (UC007)', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('desenvolvimento sem FACE_PROVIDER → mock (não exige o serviço)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.FACE_PROVIDER;
    expect(loadConfig().face.provider).toBe('mock');
  });

  it('produção sem FACE_PROVIDER → insightface (serviço real por padrão)', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'um-segredo-de-verdade-vindo-do-ambiente';
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    delete process.env.FACE_PROVIDER;
    expect(loadConfig().face.provider).toBe('insightface');
  });

  it('FACE_PROVIDER=mock força o mock mesmo em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'um-segredo-de-verdade-vindo-do-ambiente';
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.FACE_PROVIDER = 'mock';
    expect(loadConfig().face.provider).toBe('mock');
  });

  it('FACE_PROVIDER=insightface habilita o serviço em desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    process.env.FACE_PROVIDER = 'insightface';
    expect(loadConfig().face.provider).toBe('insightface');
  });

  it('serviceUrl, timeout e limiar têm defaults e são sobreponíveis por env', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.FACE_SERVICE_URL;
    delete process.env.FACE_MATCH_THRESHOLD;
    delete process.env.FACE_TIMEOUT_MS;
    const padrao = loadConfig().face;
    expect(padrao.serviceUrl).toBe('http://face:8000');
    expect(padrao.timeoutMs).toBe(5000);
    expect(padrao.limiar).toBeCloseTo(0.35, 6);

    process.env.FACE_SERVICE_URL = 'http://face-prod:8000';
    process.env.FACE_MATCH_THRESHOLD = '0.42';
    process.env.FACE_TIMEOUT_MS = '9000';
    const custom = loadConfig().face;
    expect(custom.serviceUrl).toBe('http://face-prod:8000');
    expect(custom.limiar).toBeCloseTo(0.42, 6);
    expect(custom.timeoutMs).toBe(9000);
  });
});
