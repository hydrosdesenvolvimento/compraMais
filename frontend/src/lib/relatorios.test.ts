import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { formatarExibicao, rotuloColuna, TIPOS_RELATORIO, SUPORTA_SECRETARIA } from './relatorios';

// t falso: devolve o defaultValue quando existe, senão a própria chave (isola a formatação da tradução).
const t = ((key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key) as unknown as TFunction;

describe('lib/relatorios — formatação', () => {
  it('data: formata a porção YYYY-MM-DD sem deslocar por fuso', () => {
    expect(formatarExibicao('2026-03-10T00:00:00.000Z', 'data', t, 'pt-BR')).toBe('10/03/2026');
  });

  it('moeda: usa BRL', () => {
    expect(formatarExibicao(84000, 'moeda', t, 'pt-BR')).toContain('84.000');
  });

  it('numero: usa separador de milhar', () => {
    expect(formatarExibicao(1234, 'numero', t, 'pt-BR')).toBe('1.234');
  });

  it('texto: passa pelo mapa de valores (fallback = valor cru)', () => {
    expect(formatarExibicao('publicado', 'texto', t, 'pt-BR')).toBe('publicado');
  });

  it('nulo/vazio: traço', () => {
    expect(formatarExibicao(null, 'data', t, 'pt-BR')).toBe('—');
    expect(formatarExibicao('', 'texto', t, 'pt-BR')).toBe('—');
  });

  it('rotuloColuna: usa a chave como fallback', () => {
    expect(rotuloColuna(t, 'valorEstimado')).toBe('valorEstimado');
  });

  it('catálogo: 6 tipos; secretaria só nos 3 com dimensão de secretaria', () => {
    expect(TIPOS_RELATORIO).toHaveLength(6);
    expect([...SUPORTA_SECRETARIA].sort()).toEqual(['cotas', 'distribuicoes', 'editais']);
  });
});
