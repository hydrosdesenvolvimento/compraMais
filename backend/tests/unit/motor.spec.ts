import { describe, it, expect } from 'vitest';
import {
  distribuir,
  REGRA_DESEMPATE_PADRAO,
  DemandaInvalida,
  SemAptos,
  CapacidadeInvalida,
  AptosDuplicados,
  type AptoDistribuicao,
} from '../../src/distribuicao/domain/motor.js';

/**
 * UC008 / Épico 5 — Story 5.1: motor de rateio puro e determinístico (§8 do PRD).
 * water-filling iterativo + maiores restos (Hamilton) + desempate determinístico.
 * Sem relógio/random/DB (RNF008, AD-7/8).
 */

/** Helper: monta aptos com ordem de credenciamento crescente e CNPJs distintos. */
function aptos(...tetos: number[]): AptoDistribuicao[] {
  return tetos.map((teto, i) => ({
    id: `a${i + 1}`,
    teto,
    ordemCredenciamento: i + 1,
    cnpj: String(10000000000000 + i).padStart(14, '0'),
  }));
}

/** Extrai a alocação por id, ignorando a ordem do array. */
function cotasPorId(r: { alocacoes: { id: string; cota: number }[] }): Record<string, number> {
  return Object.fromEntries(r.alocacoes.map((a) => [a.id, a.cota]));
}

describe('Motor de distribuição (§8) — rateio puro', () => {
  it('divide igualmente quando a demanda é divisível e nenhum teto limita', () => {
    const r = distribuir({ demanda: 9, aptos: aptos(100, 100, 100) });
    expect(cotasPorId(r)).toEqual({ a1: 3, a2: 3, a3: 3 });
    expect(r.deficit).toBe(false);
    expect(r.quantidadeDistribuida).toBe(9);
  });

  it('conserva a demanda: a soma das cotas é igual à demanda', () => {
    const r = distribuir({ demanda: 100, aptos: aptos(40, 40, 40, 40, 40) });
    expect(r.alocacoes.reduce((s, a) => s + a.cota, 0)).toBe(100);
  });

  it('distribui o resto pelos maiores restos (Hamilton), desempate por ordem de credenciamento', () => {
    // 10 / 3 = piso 3 cada (soma 9), resto 1 → maior fração empatada → menor ordem (a1).
    const r = distribuir({ demanda: 10, aptos: aptos(100, 100, 100) });
    expect(cotasPorId(r)).toEqual({ a1: 4, a2: 3, a3: 3 });
  });

  it('trava no teto e redistribui o saldo aos não-travados (water-filling iterativo)', () => {
    // demanda 12; a1 teto 2 trava; 10 restante entre a2,a3 → 5 e 5.
    const r = distribuir({ demanda: 12, aptos: aptos(2, 100, 100) });
    expect(cotasPorId(r)).toEqual({ a1: 2, a2: 5, a3: 5 });
    expect(r.deficit).toBe(false);
  });

  it('trava em múltiplas iterações antes de estabilizar', () => {
    // demanda 20; a1 teto 2, a2 teto 3 travam; 15 restante entre a3,a4 → 7.5 cada.
    // pisos: 2,3,7,7 (soma 19); resto 1 → fração .5 empatada → menor ordem (a3).
    const r = distribuir({ demanda: 20, aptos: aptos(2, 3, 100, 100) });
    expect(cotasPorId(r)).toEqual({ a1: 2, a2: 3, a3: 8, a4: 7 });
  });

  it('nenhuma cota ultrapassa o teto declarado (RN005)', () => {
    const r = distribuir({ demanda: 50, aptos: aptos(3, 4, 5, 100) });
    for (const a of r.alocacoes) {
      const teto = { a1: 3, a2: 4, a3: 5, a4: 100 }[a.id]!;
      expect(a.cota).toBeLessThanOrEqual(teto);
    }
    expect(r.alocacoes.reduce((s, a) => s + a.cota, 0)).toBe(50);
  });

  it('não dá resto a quem está sem folga de teto', () => {
    // demanda 11; a1 teto 2 trava; 9 entre a2,a3 → 4.5 cada; pisos 2,4,4 (10); resto 1
    // vai para a2 (menor ordem entre os com folga), nunca para a1 (sem folga).
    const r = distribuir({ demanda: 11, aptos: aptos(2, 100, 100) });
    expect(cotasPorId(r)).toEqual({ a1: 2, a2: 5, a3: 4 });
  });
});

describe('Motor de distribuição (§8) — desempate determinístico', () => {
  it('desempata por menor CNPJ quando a ordem de credenciamento coincide', () => {
    // Mesma ordem para ambos; resto 1 → menor CNPJ vence.
    const entrada = {
      demanda: 3,
      aptos: [
        { id: 'x', teto: 100, ordemCredenciamento: 1, cnpj: '22222222222222' },
        { id: 'y', teto: 100, ordemCredenciamento: 1, cnpj: '11111111111111' },
      ],
    };
    const r = distribuir(entrada);
    expect(cotasPorId(r)).toEqual({ y: 2, x: 1 });
  });

  it('ecoa a regra de desempate usada (parâmetro versionado — AD-8/RNF008)', () => {
    const r = distribuir({ demanda: 5, aptos: aptos(100, 100) });
    expect(r.regraDesempate).toBe(REGRA_DESEMPATE_PADRAO);
  });
});

describe('Motor de distribuição (§8) — déficit de abastecimento', () => {
  it('sinaliza déficit quando a capacidade total é menor que a demanda', () => {
    const r = distribuir({ demanda: 10, aptos: aptos(2, 2, 2) });
    expect(r.deficit).toBe(true);
    expect(r.deficitQuantidade).toBe(4); // 10 − 6
    expect(cotasPorId(r)).toEqual({ a1: 2, a2: 2, a3: 2 }); // todos no teto
    expect(r.quantidadeDistribuida).toBe(6);
  });

  it('capacidade exatamente igual à demanda não é déficit', () => {
    const r = distribuir({ demanda: 6, aptos: aptos(2, 2, 2) });
    expect(r.deficit).toBe(false);
    expect(r.deficitQuantidade).toBe(0);
    expect(cotasPorId(r)).toEqual({ a1: 2, a2: 2, a3: 2 });
  });
});

describe('Motor de distribuição (§8) — determinismo e reprodutibilidade (RNF008)', () => {
  it('produz o mesmo resultado byte-a-byte para a mesma entrada', () => {
    const entrada = { demanda: 37, aptos: aptos(5, 8, 100, 100, 3) };
    const a = distribuir(entrada);
    const b = distribuir(entrada);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('independe da ordem do array de entrada (serialização canônica — AD-24)', () => {
    const base = aptos(5, 8, 100, 100, 3);
    const embaralhado = [base[3]!, base[0]!, base[4]!, base[2]!, base[1]!];
    const r1 = distribuir({ demanda: 37, aptos: base });
    const r2 = distribuir({ demanda: 37, aptos: embaralhado });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('emite as alocações em ordem canônica (ordem de credenciamento, depois CNPJ)', () => {
    const base = aptos(100, 100, 100);
    const embaralhado = [base[2]!, base[0]!, base[1]!];
    const r = distribuir({ demanda: 9, aptos: embaralhado });
    expect(r.alocacoes.map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('Motor de distribuição (§8) — validação de entrada', () => {
  it('rejeita demanda não positiva ou não inteira', () => {
    expect(() => distribuir({ demanda: 0, aptos: aptos(10) })).toThrow(DemandaInvalida);
    expect(() => distribuir({ demanda: -1, aptos: aptos(10) })).toThrow(DemandaInvalida);
    expect(() => distribuir({ demanda: 2.5, aptos: aptos(10) })).toThrow(DemandaInvalida);
  });

  it('rejeita conjunto de aptos vazio', () => {
    expect(() => distribuir({ demanda: 5, aptos: [] })).toThrow(SemAptos);
  });

  it('rejeita teto não positivo ou não inteiro (RN005)', () => {
    expect(() => distribuir({ demanda: 5, aptos: aptos(0) })).toThrow(CapacidadeInvalida);
    expect(() => distribuir({ demanda: 5, aptos: aptos(-2) })).toThrow(CapacidadeInvalida);
    expect(() => distribuir({ demanda: 5, aptos: aptos(3.5) })).toThrow(CapacidadeInvalida);
  });

  it('rejeita ids de aptos duplicados', () => {
    const dup: AptoDistribuicao[] = [
      { id: 'dup', teto: 10, ordemCredenciamento: 1, cnpj: '11111111111111' },
      { id: 'dup', teto: 10, ordemCredenciamento: 2, cnpj: '22222222222222' },
    ];
    expect(() => distribuir({ demanda: 5, aptos: dup })).toThrow(AptosDuplicados);
  });
});
