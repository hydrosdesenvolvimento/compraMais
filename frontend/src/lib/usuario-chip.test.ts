import { describe, it, expect } from 'vitest';
import { iniciaisDe, montarChip } from './usuario-chip';

describe('iniciaisDe', () => {
  it('usa as duas primeiras palavras significativas, ignorando conectivos', () => {
    expect(iniciaisDe('Vale do Acre Uniformes')).toBe('VA'); // ignora "do"
    expect(iniciaisDe('Marcos Albuquerque')).toBe('MA');
    expect(iniciaisDe('Prefeitura')).toBe('P');
  });
  it('vazio/indefinido → travessão', () => {
    expect(iniciaisDe('')).toBe('—');
    expect(iniciaisDe(undefined)).toBe('—');
  });
});

describe('montarChip', () => {
  it('fornecedor: nome da pessoa + papel + fantasia, iniciais da empresa', () => {
    const chip = montarChip(
      { userId: 'u1', papel: 'procurador', empresaId: 'e1', nome: 'Marcos Albuquerque' },
      'Procurador',
      'Vale do Acre Uniformes',
    );
    expect(chip).toEqual({ nome: 'Marcos Albuquerque', papel: 'Procurador', fantasia: 'Vale do Acre Uniformes', iniciais: 'VA' });
  });

  it('servidor interno: sem empresa, iniciais do nome da pessoa', () => {
    const chip = montarChip({ userId: 'u2', papel: 'cpl', nome: 'Ana Beatriz' }, 'Analista CPL');
    expect(chip).toEqual({ nome: 'Ana Beatriz', papel: 'Analista CPL', fantasia: undefined, iniciais: 'AB' });
  });

  it('sem sessão: cai no rótulo do papel (nunca mock)', () => {
    const chip = montarChip(null, 'Visitante');
    expect(chip.nome).toBe('Visitante');
    expect(chip.fantasia).toBeUndefined();
  });

  it('sessão sem nome (token legado): usa a fantasia como nome', () => {
    const chip = montarChip({ userId: 'u3', papel: 'titular', empresaId: 'e3' }, 'Titular', 'Padaria Central');
    expect(chip.nome).toBe('Padaria Central');
    expect(chip.iniciais).toBe('PC');
  });
});
