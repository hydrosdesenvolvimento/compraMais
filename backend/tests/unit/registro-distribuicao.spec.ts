import { describe, it, expect } from 'vitest';
import { montarRegistro, montarRegistroPorItem, hashDistribuicao, hashDistribuicaoItens, serializarCanonico, type ItemDistribuicao } from '../../src/distribuicao/domain/registro-distribuicao.js';
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

  // Fase 2 — registro POR ITEM.
  const itens: ItemDistribuicao[] = [
    { itemId: 'i1', demanda: 10, distribuido: 10, deficit: false, deficitQuantidade: 0, alocacoes: [{ fornecedorId: 'fA', cota: 5 }, { fornecedorId: 'fB', cota: 5 }] },
    { itemId: 'i2', demanda: 8, distribuido: 5, deficit: true, deficitQuantidade: 3, alocacoes: [{ fornecedorId: 'fA', cota: 5 }] },
  ];

  it('montarRegistroPorItem: deriva os totais do edital e o rateio AGREGADO (soma das cotas dos itens)', () => {
    const reg = montarRegistroPorItem({ id: 'r', editalId: 'e1', versao: 1, geradoEm: '2026-07-17T00:00:00Z', regraDesempate: 'ordem_credenciamento_cnpj', itens });
    expect(reg.demandaTotal).toBe(18); // 10 + 8
    expect(reg.quantidadeDistribuida).toBe(15); // 10 + 5
    expect(reg.deficit).toBe(true);
    expect(reg.deficitQuantidade).toBe(3);
    // fA = 5 (i1) + 5 (i2) = 10; fB = 5 (i1)
    expect(reg.alocacoes).toEqual([{ fornecedorId: 'fA', cota: 10 }, { fornecedorId: 'fB', cota: 5 }]);
    expect(reg.itens).toHaveLength(2);
    expect(reg.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash por item é reprodutível e sensível ao conteúdo dos itens', () => {
    const h1 = hashDistribuicaoItens('e1', 'ordem_credenciamento_cnpj', itens);
    const h2 = hashDistribuicaoItens('e1', 'ordem_credenciamento_cnpj', itens.map((i) => ({ ...i, alocacoes: [...i.alocacoes] })));
    expect(h1).toBe(h2);
    const mexido = [{ ...itens[0]!, alocacoes: [{ fornecedorId: 'fA', cota: 6 }, { fornecedorId: 'fB', cota: 4 }] }, itens[1]!];
    expect(hashDistribuicaoItens('e1', 'ordem_credenciamento_cnpj', mexido)).not.toBe(h1);
  });
});
