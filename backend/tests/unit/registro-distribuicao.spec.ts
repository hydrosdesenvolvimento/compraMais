import { describe, it, expect } from 'vitest';
import { montarRegistro, hashDistribuicao, serializarCanonico } from '../../src/distribuicao/domain/registro-distribuicao.js';
import { distribuir } from '../../src/distribuicao/domain/motor.js';

const aptos = [
  { id: 'fA', teto: 10, ordemCredenciamento: 1, cnpj: '11111111111111' },
  { id: 'fB', teto: 10, ordemCredenciamento: 2, cnpj: '22222222222222' },
];

describe('RegistroDistribuicao (Story 5.2 — hash canônico)', () => {
  it('monta o registro a partir do resultado do motor (alocações → fornecedorId/cota)', () => {
    const r = distribuir({ demanda: 10, aptos });
    const reg = montarRegistro({ id: 'reg1', editalId: 'e1', versao: 1, geradoEm: '2026-07-17T00:00:00Z', resultado: r });
    expect(reg.demandaTotal).toBe(10);
    expect(reg.quantidadeDistribuida).toBe(10);
    expect(reg.deficit).toBe(false);
    expect(reg.alocacoes).toEqual([{ fornecedorId: 'fA', cota: 5 }, { fornecedorId: 'fB', cota: 5 }]);
    expect(reg.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('o hash é reprodutível: mesma entrada → mesmo hash (o motor é puro, RNF008/AD-24)', () => {
    const r1 = distribuir({ demanda: 10, aptos });
    const r2 = distribuir({ demanda: 10, aptos: [...aptos].reverse() }); // ordem de entrada não importa (canônico)
    expect(hashDistribuicao('e1', r1)).toBe(hashDistribuicao('e1', r2));
  });

  it('o hash muda quando a matriz muda (edital, demanda ou cotas)', () => {
    const r = distribuir({ demanda: 10, aptos });
    expect(hashDistribuicao('e1', r)).not.toBe(hashDistribuicao('e2', r)); // editalId entra no hash
    const outro = distribuir({ demanda: 8, aptos });
    expect(hashDistribuicao('e1', r)).not.toBe(hashDistribuicao('e1', outro));
  });

  it('a serialização canônica não inclui metadados de linha (id/versão/geradoEm)', () => {
    const r = distribuir({ demanda: 10, aptos });
    expect(serializarCanonico('e1', r)).toBe('e1|ordem_credenciamento_cnpj|10|10|0|fA:5,fB:5');
  });
});
