import { describe, it, expect, afterEach } from 'vitest';
import { loadConfig } from '../../src/shared/config/env.js';

/**
 * AD-36 / RNF007 (NIV-06): os prazos de retenção por categoria (FR-008) são política pública e devem
 * ser configuráveis por ambiente — não hardcoded no construtor do caso de uso. Aqui garantimos que
 * `loadConfig` externaliza os prazos, mantendo os defaults conservadores atuais quando o ambiente
 * nada informa e caindo neles quando o valor é inválido (mesmo contrato de `toInt`).
 */
describe('prazos de retenção por categoria (AD-36 / RNF007)', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('sem env → defaults conservadores atuais (cadastral 730, fiscal/contratual 1825, padrão 1825)', () => {
    delete process.env.RETENCAO_CADASTRAL_DIAS;
    delete process.env.RETENCAO_FISCAL_DIAS;
    delete process.env.RETENCAO_CONTRATUAL_DIAS;
    delete process.env.RETENCAO_PADRAO_DIAS;

    expect(loadConfig().retencaoDias).toEqual({ cadastral: 730, fiscal: 1825, contratual: 1825, padrao: 1825 });
  });

  it('com env → usa os prazos do ambiente', () => {
    process.env.RETENCAO_CADASTRAL_DIAS = '365';
    process.env.RETENCAO_FISCAL_DIAS = '2555';
    process.env.RETENCAO_CONTRATUAL_DIAS = '3650';
    process.env.RETENCAO_PADRAO_DIAS = '1000';

    expect(loadConfig().retencaoDias).toEqual({ cadastral: 365, fiscal: 2555, contratual: 3650, padrao: 1000 });
  });

  it('valor inválido → cai no default daquele prazo (contrato de toInt)', () => {
    process.env.RETENCAO_CADASTRAL_DIAS = 'abc';
    delete process.env.RETENCAO_FISCAL_DIAS;

    const r = loadConfig().retencaoDias;
    expect(r.cadastral).toBe(730);
    expect(r.fiscal).toBe(1825);
  });
});
