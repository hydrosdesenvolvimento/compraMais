import { describe, it, expect } from 'vitest';
import { formatarNumeroEdital, exigirNumeroEdital, anoDoNumeroEdital, NumeroEditalInvalido } from '../../src/editais/domain/numero-edital.js';
import { NumeradorEditaisMemory } from '../../src/editais/adapters/numerador-editais-memory.js';

/**
 * Numeração oficial do edital (ED-AAAA/NNN) — identificador humano exibido na vitrine e em
 * "Meus Credenciamentos". Sequência reinicia a cada ano; a unicidade é garantida pelo numerador.
 */
describe('Número do edital (ED-AAAA/NNN)', () => {
  it('formata com sequencial de 3 dígitos zero-padded', () => {
    expect(formatarNumeroEdital(2026, 3)).toBe('ED-2026/003');
    expect(formatarNumeroEdital(2026, 118)).toBe('ED-2026/118');
  });

  it('não trunca sequencial acima de 999 (o ano não fica sem números)', () => {
    expect(formatarNumeroEdital(2026, 1000)).toBe('ED-2026/1000');
  });

  it('recusa sequencial não positivo ou não inteiro', () => {
    expect(() => formatarNumeroEdital(2026, 0)).toThrow(NumeroEditalInvalido);
    expect(() => formatarNumeroEdital(2026, 1.5)).toThrow(NumeroEditalInvalido);
  });

  it('valida o formato e devolve o número normalizado', () => {
    expect(exigirNumeroEdital('ED-2026/003')).toBe('ED-2026/003');
    expect(exigirNumeroEdital('  ed-2026/003  ')).toBe('ED-2026/003'); // normaliza caixa e espaços
  });

  it('recusa números fora do formato', () => {
    for (const invalido of ['', '2026/003', 'ED-26/003', 'ED-2026-003', 'ED-2026/', 'ED-2026/abc']) {
      expect(() => exigirNumeroEdital(invalido)).toThrow(NumeroEditalInvalido);
    }
  });

  it('extrai o ano do número', () => {
    expect(anoDoNumeroEdital('ED-2026/003')).toBe(2026);
  });
});

describe('NumeradorEditaisMemory', () => {
  it('sequencia por ano e reinicia no ano seguinte', async () => {
    const n = new NumeradorEditaisMemory();
    expect(await n.proximo(2026)).toBe(1);
    expect(await n.proximo(2026)).toBe(2);
    expect(await n.proximo(2027)).toBe(1); // ano novo → sequência reinicia
    expect(await n.proximo(2026)).toBe(3);
  });

  it('não repete números sob concorrência', async () => {
    const n = new NumeradorEditaisMemory();
    const seqs = await Promise.all(Array.from({ length: 50 }, () => n.proximo(2026)));
    expect(new Set(seqs).size).toBe(50);
  });
});
