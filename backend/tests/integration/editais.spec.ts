import { describe, it, expect, beforeEach } from 'vitest';
import { EditalRepositoryMemory } from '../../src/editais/adapters/edital-repository-memory.js';
import { GerirEditais } from '../../src/editais/application/gerir-editais.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

describe('Gestão de editais (US1)', () => {
  let repo: EditalRepositoryMemory; let bus: InMemoryEventBus; let uc: GerirEditais; const actor = { userId: 'gestor1' };
  const base = { secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2099-12-31' };

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
    const { editalId } = await uc.criar({ ...base, quantitativos: 0 }, actor);
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

  it('encerrar aberto → sai de abertos', async () => {
    const { editalId } = await uc.criar(base, actor);
    await uc.publicar(editalId, actor);
    await uc.encerrar(editalId, actor);
    expect((await repo.abertos()).map((e) => e.id)).not.toContain(editalId);
  });

  it('avança o ciclo AD-37 emitindo os eventos de transição (auditoria AD-18)', async () => {
    const eventos: string[] = [];
    for (const nome of ['EditalEmAnalise', 'EditalEmDistribuicao', 'EditalHomologado', 'EditalEmExecucao']) {
      bus.subscribe(nome, async () => { eventos.push(nome); });
    }
    const { editalId } = await uc.criar(base, actor);
    await uc.publicar(editalId, actor);
    await uc.iniciarAnalise(editalId, actor);
    await uc.iniciarDistribuicao(editalId, actor);
    expect((await repo.porId(editalId))?.podeDistribuir).toBe(true); // guarda do motor (Épico 5)
    await uc.homologar(editalId, actor);
    await uc.iniciarExecucao(editalId, actor);
    expect((await repo.porId(editalId))?.situacao).toBe('em_execucao');
    expect(eventos).toEqual(['EditalEmAnalise', 'EditalEmDistribuicao', 'EditalHomologado', 'EditalEmExecucao']);
  });
});
