import { describe, it, expect } from 'vitest';
import {
  MaterialServico,
  TipoInvalido,
  UnidadeObrigatoria,
  formatarNumeroItem,
  NumeroItemInvalido,
} from '../../src/catalogos/domain/material-servico.js';
import { CampoObrigatorio } from '../../src/catalogos/domain/item-catalogo.js';
import { NumeradorItensMemory } from '../../src/catalogos/application/numerador-itens.js';

/**
 * Catálogo de Materiais e Serviços (4º catálogo de UC020). Modelo derivado do `comprac_api`
 * (`ItemCatalogo`: número, nome, especificações técnicas, unidades, tipo Material|Serviço), adaptado às
 * invariantes deste projeto: `ItemCatalogo` como base (inativação lógica RN015), snapshot `estado()`
 * (AD-33) e chave natural = **nome** (mesma regra de unicidade de TipoDocumento).
 */
describe('MaterialServico (domínio)', () => {
  const base = { id: 'i1', nome: 'Cabo de rede CAT6', unidades: ['un'], userName: 'smga1' };

  it('nasce ativo, do tipo material por padrão, com o número recebido', () => {
    const item = MaterialServico.criar({ ...base, numero: 'ITM-2026/001' });
    expect(item.numero).toBe('ITM-2026/001');
    expect(item.nome).toBe('Cabo de rede CAT6');
    expect(item.tipo).toBe('material');
    expect(item.ativo).toBe(true);
    expect(item.situacao).toBe('ativo');
  });

  it('aceita o tipo serviço e normaliza as unidades (trim, sem vazios, sem duplicatas)', () => {
    const item = MaterialServico.criar({
      ...base, numero: 'ITM-2026/002', tipo: 'servico',
      unidades: [' h ', 'h', '', '  ', 'm²'],
    });
    expect(item.tipo).toBe('servico');
    expect(item.unidades).toEqual(['h', 'm²']);
  });

  it('exige nome e ao menos uma unidade de medida', () => {
    expect(() => MaterialServico.criar({ ...base, numero: 'ITM-2026/003', nome: '  ' })).toThrow(CampoObrigatorio);
    expect(() => MaterialServico.criar({ ...base, numero: 'ITM-2026/003', unidades: ['  ', ''] })).toThrow(UnidadeObrigatoria);
  });

  it('recusa tipo fora do domínio', () => {
    expect(() => MaterialServico.criar({ ...base, numero: 'ITM-2026/004', tipo: 'obra' as never })).toThrow(TipoInvalido);
  });

  it('a chave natural é o nome normalizado (unicidade case-insensitive, como TipoDocumento)', () => {
    const a = MaterialServico.criar({ ...base, numero: 'ITM-2026/005', nome: 'Cabo de Rede CAT6' });
    const b = MaterialServico.criar({ ...base, numero: 'ITM-2026/006', nome: '  cabo de rede cat6  ' });
    expect(a.chave()).toBe(b.chave());
  });

  it('editar devolve o diff antes/depois só dos campos que mudaram (AD-18)', () => {
    const item = MaterialServico.criar({ ...base, numero: 'ITM-2026/007' });
    const diff = item.editar({ nome: 'Cabo de rede CAT6 blindado', tipo: 'servico', especificacoes: 'Norma X' }, 'smga2');
    expect(diff).toHaveLength(3);
    expect(diff.find((d) => d.campo === 'tipo')).toMatchObject({ antes: 'material', depois: 'servico' });
    expect(item.lastUserUpdate).toBe('smga2');

    expect(item.editar({ nome: 'Cabo de rede CAT6 blindado' }, 'smga3')).toHaveLength(0);
  });

  it('o número é imutável — editar não o alcança', () => {
    const item = MaterialServico.criar({ ...base, numero: 'ITM-2026/008' });
    item.editar({ numero: 'ITM-2026/999' } as never, 'smga2');
    expect(item.numero).toBe('ITM-2026/008');
  });

  it('inativar/reativar é exclusão lógica idempotente (RN015)', () => {
    const item = MaterialServico.criar({ ...base, numero: 'ITM-2026/009' });
    item.inativar('smga1');
    item.inativar('smga1');
    expect(item.ativo).toBe(false);
    item.reativar('smga1');
    expect(item.ativo).toBe(true);
  });

  it('estado/deEstado faz round-trip fiel (AD-33)', () => {
    const item = MaterialServico.criar({
      ...base, numero: 'ITM-2026/010', tipo: 'servico',
      especificacoes: 'Instalação com certificação', unidades: ['h', 'ponto'],
    });
    item.inativar('smga9');
    const copia = MaterialServico.deEstado(item.estado());
    expect(copia.estado()).toEqual(item.estado());
    expect(copia.unidades).toEqual(['h', 'ponto']);
    expect(copia.ativo).toBe(false);
  });
});

describe('Numeração do item de catálogo (ITM-AAAA/NNN)', () => {
  it('formata o sequencial com 3 dígitos, sem truncar acima de 999', () => {
    expect(formatarNumeroItem(2026, 1)).toBe('ITM-2026/001');
    expect(formatarNumeroItem(2026, 42)).toBe('ITM-2026/042');
    expect(formatarNumeroItem(2026, 1234)).toBe('ITM-2026/1234');
  });

  it('recusa sequencial inválido', () => {
    expect(() => formatarNumeroItem(2026, 0)).toThrow(NumeroItemInvalido);
  });

  it('o numerador em memória nunca repete um sequencial do mesmo ano', async () => {
    const n = new NumeradorItensMemory();
    const emitidos = await Promise.all(Array.from({ length: 10 }, () => n.proximo(2026)));
    expect(new Set(emitidos).size).toBe(10);
    expect(await n.proximo(2027)).toBe(1); // sequência reinicia por ano
  });
});
