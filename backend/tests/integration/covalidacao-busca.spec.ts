import { describe, it, expect, beforeEach } from 'vitest';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { DocumentoRepositoryMemory } from '../../src/credenciamento/adapters/documentos-memory.js';
import { Covalidar } from '../../src/credenciamento/application/covalidar.js';

/**
 * Busca por instância parcial (QBE — FR-015 / Constituição §IV / v3.3.0).
 * O probe é uma instância parcial de Documento (status, tipo): campos preenchidos filtram por AND,
 * ausentes são ignorados; paginação fica fora do probe; sem status → default 'pendente'.
 */
describe('Fila de covalidação — busca QBE (FR-015)', () => {
  let docs: DocumentoRepositoryMemory;
  const stubAnalises = { salvar: async () => {} };
  const stubBus = { publish: async () => {}, subscribe: () => {} } as never;

  beforeEach(async () => {
    docs = new DocumentoRepositoryMemory();
    const mk = (id: string, fornecedorId: string, tipo: string, status: 'pendente' | 'reprovado') => {
      const d = Documento.enviar({ id, fornecedorId, tipo, arquivoRef: 'r', formato: 'pdf' });
      if (status === 'reprovado') d.reprovar('ilegível', 'cpl1');
      return d;
    };
    await docs.salvar(mk('d1', 'f1', 'balanco', 'pendente'));
    await docs.salvar(mk('d2', 'f1', 'certidao', 'pendente'));
    await docs.salvar(mk('d3', 'f1', 'balanco', 'reprovado'));
    await docs.salvar(mk('d4', 'f2', 'balanco', 'pendente')); // outro fornecedor
  });

  it('probe AND (status+tipo) retorna só os correspondentes', async () => {
    const r = await docs.buscarPorExemplo({ fornecedorId: 'f1', status: 'reprovado', tipo: 'balanco' });
    expect(r.map((d) => d.id)).toEqual(['d3']);
  });

  it('campos ausentes no probe são ignorados (só fornecedorId+status)', async () => {
    const r = await docs.buscarPorExemplo({ fornecedorId: 'f1', status: 'pendente' });
    expect(r.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('paginação fica fora do probe', async () => {
    const r = await docs.buscarPorExemplo({ fornecedorId: 'f1', status: 'pendente' }, { page: 1, size: 1 });
    expect(r).toHaveLength(1);
  });

  it('use case: sem status no probe → default pendente', async () => {
    const cov = new Covalidar(docs, stubAnalises, stubBus);
    const r = await cov.buscarFila('f1', {});
    expect(r.map((d) => d.id).sort()).toEqual(['d1', 'd2']);
  });

  it('use case: probe por tipo filtra dentro do default pendente', async () => {
    const cov = new Covalidar(docs, stubAnalises, stubBus);
    const r = await cov.buscarFila('f1', { tipo: 'balanco' });
    expect(r.map((d) => d.id)).toEqual(['d1']);
  });
});
