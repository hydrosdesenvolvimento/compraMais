import { describe, it, expect } from 'vitest';
import {
  ItemEdital,
  QuantidadeInvalida,
  PrecoInvalido,
} from '../../src/editais/domain/item-edital.js';

/**
 * Item do edital (adaptado de `comprac_api` `item-lote-edital.ts`, SEM a camada de lote). Guarda a
 * referência ao item do catálogo, um **snapshot** de nome/descrição (estável mesmo que o catálogo mude
 * depois — como na referência), a unidade escolhida, a quantidade e o preço-teto unitário.
 */
describe('ItemEdital (domínio)', () => {
  const base = {
    id: 'it1', editalId: 'ed1', numero: 1, itemCatalogoId: 'cat1',
    nomeSnapshot: 'Cabo de rede CAT6', descricaoSnapshot: 'U/UTP 4 pares',
    unidade: 'm', quantidade: 500, precoTeto: 4.9, userName: 'smga1',
  };

  it('cria com snapshot do catálogo, unidade, quantidade e preço-teto', () => {
    const i = ItemEdital.criar(base);
    expect(i.editalId).toBe('ed1');
    expect(i.numero).toBe(1);
    expect(i.itemCatalogoId).toBe('cat1');
    expect(i.nomeSnapshot).toBe('Cabo de rede CAT6');
    expect(i.descricaoSnapshot).toBe('U/UTP 4 pares');
    expect(i.unidade).toBe('m');
    expect(i.quantidade).toBe(500);
    expect(i.precoTeto).toBe(4.9);
  });

  it('aceita descrição nula (item de catálogo sem especificações)', () => {
    const i = ItemEdital.criar({ ...base, descricaoSnapshot: null });
    expect(i.descricaoSnapshot).toBeNull();
  });

  it('exige quantidade inteira positiva', () => {
    expect(() => ItemEdital.criar({ ...base, quantidade: 0 })).toThrow(QuantidadeInvalida);
    expect(() => ItemEdital.criar({ ...base, quantidade: -5 })).toThrow(QuantidadeInvalida);
    expect(() => ItemEdital.criar({ ...base, quantidade: 2.5 })).toThrow(QuantidadeInvalida);
  });

  it('exige preço-teto positivo e finito (montante monetário)', () => {
    expect(() => ItemEdital.criar({ ...base, precoTeto: 0 })).toThrow(PrecoInvalido);
    expect(() => ItemEdital.criar({ ...base, precoTeto: -1 })).toThrow(PrecoInvalido);
    expect(() => ItemEdital.criar({ ...base, precoTeto: Number.NaN })).toThrow(PrecoInvalido);
  });

  it('estado/deEstado faz round-trip fiel (AD-33)', () => {
    const i = ItemEdital.criar(base);
    const copia = ItemEdital.deEstado(i.estado());
    expect(copia.estado()).toEqual(i.estado());
  });
});
