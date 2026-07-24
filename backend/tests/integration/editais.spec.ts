import { describe, it, expect, beforeEach } from 'vitest';
import { EditalRepositoryMemory } from '../../src/editais/adapters/edital-repository-memory.js';
import { GerirEditais, EditalComCredenciamentos } from '../../src/editais/application/gerir-editais.js';
import { EditalNaoEditavel, TransicaoInvalida } from '../../src/editais/domain/edital.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

describe('Gestão de editais (US1)', () => {
  let repo: EditalRepositoryMemory; let bus: InMemoryEventBus; let uc: GerirEditais; const actor = { userId: 'gestor1' };
  const base = { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], prazoVigencia: '2099-12-31' };

  beforeEach(() => { repo = new EditalRepositoryMemory(); bus = new InMemoryEventBus(); uc = new GerirEditais(repo, bus); });

  it('cria em rascunho e publica → aparece em abertos (vitrine)', async () => {
    const { editalId } = await uc.criar(base, actor);
    expect((await repo.porId(editalId))?.situacao).toBe('rascunho');
    await uc.publicar(editalId, actor);
    expect((await repo.abertos()).map((e) => e.id)).toContain(editalId);
  });

  it('CNAE inválido recusa a criação (FR-012)', async () => {
    await expect(uc.criar({ ...base, cnaesAlvo: ['ABC'] }, actor)).rejects.toThrow(/Invalid CNAE/);
  });

  it('publicar incompleto → erro com o que falta (FR-004)', async () => {
    // Sem CNAE alvo o edital fica incompleto para publicar (a demanda deixou de ser campo do edital).
    const { editalId } = await uc.criar({ ...base, cnaesAlvo: [] }, actor);
    await expect(uc.publicar(editalId, actor)).rejects.toThrow(/incomplete/i);
  });

  it('editar publicado emite EditalEditado (antes/depois) — FR-013', async () => {
    const eventos: string[] = [];
    bus.subscribe('EditalEditado', async () => { eventos.push('EditalEditado'); });
    bus.subscribe('PublicoAlvoAmpliado', async () => { eventos.push('PublicoAlvoAmpliado'); });
    const { editalId } = await uc.criar(base, actor);
    await uc.publicar(editalId, actor);
    await uc.editar(editalId, { cnaesAlvo: ['1091101', '1092900'] }, actor);
    expect(eventos).toContain('EditalEditado');
    expect(eventos).toContain('PublicoAlvoAmpliado'); // ampliou alvo (FR-014)
  });

  it('encerrar publicado → sai de abertos', async () => {
    const { editalId } = await uc.criar(base, actor);
    await uc.publicar(editalId, actor);
    await uc.encerrar(editalId, actor);
    expect((await repo.abertos()).map((e) => e.id)).not.toContain(editalId);
  });

  it('editarComoRascunho só em rascunho: publicado → EditalNaoEditavel', async () => {
    const { editalId } = await uc.criar(base, actor);
    await uc.editarComoRascunho(editalId, { objeto: 'merenda revisada' }, actor); // rascunho: ok
    expect((await repo.porId(editalId))?.objeto).toBe('merenda revisada');
    await uc.publicar(editalId, actor);
    await expect(uc.editarComoRascunho(editalId, { objeto: 'x' }, actor)).rejects.toThrow(EditalNaoEditavel);
  });

  it('despublicar sem credenciamentos: publicado → rascunho + evento; rascunho → TransicaoInvalida', async () => {
    const eventos: string[] = [];
    bus.subscribe('EditalDespublicado', async () => { eventos.push('EditalDespublicado'); });
    const { editalId } = await uc.criar(base, actor);
    await uc.publicar(editalId, actor);
    await uc.despublicar(editalId, actor);
    expect((await repo.porId(editalId))?.situacao).toBe('rascunho');
    expect(eventos).toContain('EditalDespublicado');
    await expect(uc.despublicar(editalId, actor)).rejects.toThrow(TransicaoInvalida); // já é rascunho
  });

  it('despublicar bloqueada quando há credenciamentos associados → EditalComCredenciamentos', async () => {
    const comCreds = new GerirEditais(repo, bus, undefined, undefined, undefined, undefined, { contarDoEdital: async () => 2 });
    const { editalId } = await comCreds.criar(base, actor);
    await comCreds.publicar(editalId, actor);
    await expect(comCreds.despublicar(editalId, actor)).rejects.toThrow(EditalComCredenciamentos);
    expect((await repo.porId(editalId))?.situacao).toBe('publicado'); // permanece publicado
  });
});
