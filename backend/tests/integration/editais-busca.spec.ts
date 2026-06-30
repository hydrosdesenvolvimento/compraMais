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
});
