import { describe, it, expect } from 'vitest';
import {
  compararCosseno,
  corresponde,
  LIMIAR_PADRAO_COSSENO,
  VetorInvalido,
} from '../../src/shared/acl/facial/comparar-cosseno.js';

describe('compararCosseno (verificação facial 1:1, UC007)', () => {
  it('vetores idênticos → similaridade 1 (mesma pessoa/mesma foto)', () => {
    const v = [0.1, 0.2, 0.3, 0.4];
    expect(compararCosseno(v, v)).toBeCloseTo(1, 6);
  });

  it('é invariante à escala (só direção importa — cosseno)', () => {
    expect(compararCosseno([1, 0, 0], [3, 0, 0])).toBeCloseTo(1, 6);
  });

  it('vetores ortogonais → 0', () => {
    expect(compararCosseno([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('vetores opostos → -1', () => {
    expect(compararCosseno([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
  });

  it('valor intermediário calculado corretamente', () => {
    // a·b = 1 ; |a|=√2 ; |b|=1 → 1/√2 ≈ 0.7071
    expect(compararCosseno([1, 1], [1, 0])).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it('rejeita dimensões incompatíveis (modelos diferentes → nunca comparar)', () => {
    expect(() => compararCosseno([1, 2, 3], [1, 2])).toThrow(VetorInvalido);
  });

  it('rejeita vetor vazio', () => {
    expect(() => compararCosseno([], [])).toThrow(VetorInvalido);
  });

  it('rejeita vetor de norma zero (embedding degenerado)', () => {
    expect(() => compararCosseno([0, 0, 0], [1, 2, 3])).toThrow(VetorInvalido);
  });
});

describe('corresponde (gate do passo Prova de Vida)', () => {
  it('acima do limiar → true', () => {
    expect(corresponde([1, 0, 0], [1, 0, 0], 0.5)).toBe(true);
  });

  it('abaixo do limiar → false', () => {
    expect(corresponde([1, 0], [0, 1], 0.5)).toBe(false);
  });

  it('exatamente no limiar → true (limiar inclusivo)', () => {
    // cosseno = 1/2 exato
    expect(corresponde([1, 0], [1, Math.sqrt(3)], 0.5)).toBe(true);
  });

  it('usa o limiar padrão quando não informado', () => {
    expect(LIMIAR_PADRAO_COSSENO).toBeGreaterThan(0);
    expect(LIMIAR_PADRAO_COSSENO).toBeLessThan(1);
    expect(corresponde([1, 0, 0], [1, 0, 0])).toBe(true);
  });
});
