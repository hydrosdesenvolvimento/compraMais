import { describe, it, expect, beforeEach } from 'vitest';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { DocumentoRepositoryMemory } from '../../src/credenciamento/adapters/documentos-memory.js';
import { Covalidar } from '../../src/credenciamento/application/covalidar.js';
import { Fornecedor } from '../../src/catalogo/domain/fornecedor.js';
import type { FornecedorRepository } from '../../src/catalogo/application/fornecedor-repository.js';

/**
 * Fila GLOBAL da tela "Análise Documental" (RF004 / UC006). Diferente de `buscarFila` (por
 * fornecedor), `filaAnalise` cruza TODOS os fornecedores e resolve empresa + CNPJ para exibição.
 */
describe('Fila global de análise documental (filaAnalise)', () => {
  let docs: DocumentoRepositoryMemory;
  const stubAnalises = { salvar: async () => {} };
  const stubBus = { publish: async () => {}, subscribe: () => {} } as never;

  const fornecedor = (id: string, cnpj: string, razaoSocial: string) => Fornecedor.deEstado({
    meta: { id, registerDate: '2026-06-01T00:00:00.000Z', updateDate: '2026-06-01T00:00:00.000Z', lastUserUpdate: 'seed' },
    cnpj, razaoSocial, porte: 'ME', cnaes: [], situacao: 'ativa', origem: 'manual', contato: {},
    status: 'pendente_analise', sincronizadoEm: null,
  });
  const forn: Pick<FornecedorRepository, 'listar'> = {
    listar: async () => [
      fornecedor('f1', '12345678000195', 'Malharia Maria'),
      fornecedor('f2', '77888999000181', 'Têxtil Amazônia'),
    ],
  };

  const mk = (id: string, fornecedorId: string, tipo: string, status: 'pendente' | 'reprovado') => {
    const d = Documento.enviar({ id, fornecedorId, tipo, arquivoRef: 'r', formato: 'pdf' });
    if (status === 'reprovado') d.reprovar('ilegível', 'cpl1');
    return d;
  };

  beforeEach(async () => {
    docs = new DocumentoRepositoryMemory();
    await docs.salvar(mk('d1', 'f1', 'Balanço Patrimonial', 'pendente'));
    await docs.salvar(mk('d2', 'f2', 'Balanço Patrimonial', 'pendente'));
    await docs.salvar(mk('d3', 'f1', 'Atestado', 'reprovado')); // não é pendente → fora da fila
  });

  it('lista só pendentes de todos os fornecedores, com empresa e CNPJ resolvidos', async () => {
    const cov = new Covalidar(docs, stubAnalises, stubBus, forn as FornecedorRepository);
    const r = await cov.filaAnalise();
    expect(r.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    const d1 = r.find((x) => x.id === 'd1')!;
    expect(d1.empresa).toBe('Malharia Maria');
    expect(d1.cnpj).toBe('12.345.678/0001-95'); // Cnpj.valor já vem formatado; o front re-mascara (idempotente)
    expect(d1.fornecedorId).toBe('f1');
  });

  it('documento sem fornecedor casado cai no fallback (id) e nunca desaparece da fila', async () => {
    await docs.salvar(mk('d9', 'orfao', 'Balanço Patrimonial', 'pendente'));
    const cov = new Covalidar(docs, stubAnalises, stubBus, forn as FornecedorRepository);
    const r = await cov.filaAnalise();
    const orfao = r.find((x) => x.id === 'd9')!;
    expect(orfao).toBeDefined();
    expect(orfao.empresa).toBe('orfao');
    expect(orfao.cnpj).toBeNull();
  });

  it('sem repositório de fornecedores, ainda lista os pendentes (empresa = id)', async () => {
    const cov = new Covalidar(docs, stubAnalises, stubBus);
    const r = await cov.filaAnalise();
    expect(r.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(r.every((x) => x.cnpj === null)).toBe(true);
  });
});
