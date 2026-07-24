import { describe, it, expect, beforeEach } from 'vitest';
import { EditalRepositoryMemory } from '../../src/editais/adapters/edital-repository-memory.js';
import { BuscarEditais } from '../../src/editais/application/buscar-editais.js';
import { GerirEditais } from '../../src/editais/application/gerir-editais.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/** Busca por instância parcial (QBE — FR-011): probe AND; ausentes ignorados; paginação fora do probe. */
describe('Busca de editais — QBE (US3 / FR-011)', () => {
  let repo: EditalRepositoryMemory; let buscar: BuscarEditais;

  beforeEach(async () => {
    repo = new EditalRepositoryMemory();
    const gerir = new GerirEditais(repo, new InMemoryEventBus());
    const a = { userId: 'g' };
    const e1 = await gerir.criar({ secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 5, prazoVigencia: '2099-12-31' }, a);
    await gerir.publicar(e1.editalId, a); // publicado
    await gerir.criar({ secretariaId: 's1', objeto: 'limpeza', cnaesAlvo: ['8121400'], quantitativos: 5, prazoVigencia: '2099-12-31' }, a); // rascunho
    const e3 = await gerir.criar({ secretariaId: 's2', objeto: 'mobiliario', cnaesAlvo: ['3101200'], quantitativos: 5, prazoVigencia: '2099-12-31' }, a);
    await gerir.publicar(e3.editalId, a);
    buscar = new BuscarEditais(repo);
  });

  it('probe AND (secretaria + situação)', async () => {
    const r = await buscar.buscar({ secretariaId: 's1', situacao: 'publicado' });
    expect(r.map((e) => e.objeto)).toEqual(['merenda']);
  });

  it('campos ausentes ignorados (só situação)', async () => {
    const r = await buscar.buscar({ situacao: 'publicado' });
    expect(r.map((e) => e.objeto).sort()).toEqual(['merenda', 'mobiliario']);
  });

  it('filtro por CNAE alvo', async () => {
    const r = await buscar.buscar({ cnae: '3101200' });
    expect(r.map((e) => e.objeto)).toEqual(['mobiliario']);
  });

  it('paginação fora do probe', async () => {
    const r = await buscar.buscar({ situacao: 'publicado' }, { page: 1, size: 1 });
    expect(r).toHaveLength(1);
  });

  it('filtro por texto (parcial, case-insensitive) em objeto/número', async () => {
    const r = await buscar.buscar({ texto: 'LIMP' });
    expect(r.map((e) => e.objeto)).toEqual(['limpeza']);
  });

  it('buscarPagina expõe total do filtro (não só a página) + eco de page/size', async () => {
    const p1 = await buscar.buscarPagina({ situacao: 'publicado' }, { page: 1, size: 1 });
    expect(p1.items).toHaveLength(1);
    expect(p1.total).toBe(2); // merenda + mobiliario
    expect(p1).toMatchObject({ page: 1, size: 1 });
    const p2 = await buscar.buscarPagina({ situacao: 'publicado' }, { page: 2, size: 1 });
    expect(p2.items).toHaveLength(1);
    expect(p2.items[0].id).not.toBe(p1.items[0].id); // página seguinte traz outro registro
  });

  it('buscarPagina sem paginação usa defaults (page 1, size 20)', async () => {
    const p = await buscar.buscarPagina({});
    expect(p).toMatchObject({ page: 1, size: 20, total: 3 });
    expect(p.items).toHaveLength(3);
  });

  // A tela "Operação · Editais" (Painel Admin) consome número, quantitativo e prazo desta busca.
  it('expõe número oficial, quantitativo e prazo no read model', async () => {
    const [merenda] = await buscar.buscar({ secretariaId: 's1', situacao: 'publicado' });
    expect(merenda.numero).toMatch(/^ED-\d{4}\/\d{3}$/);
    expect(merenda.quantitativos).toBe(5);
    expect(merenda.prazoVigencia).toBe('2099-12-31');
    expect(merenda.cnaesAlvo).toEqual(['1091101']);
  });
});
