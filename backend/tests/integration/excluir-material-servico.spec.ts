import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogoRepositoryMemory } from '../../src/catalogos/adapters/catalogo-repository-memory.js';
import { MaterialServico } from '../../src/catalogos/domain/material-servico.js';
import {
  ExcluirMaterialServico, MaterialNaoEncontrado, MaterialAtivoNaoExcluivel, MaterialVinculadoAEdital,
} from '../../src/catalogos/application/excluir-material-servico.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * UC020 — exclusão FÍSICA de materiais/serviços (só inativo e sem vínculo a edital). Guardas do caso de
 * uso, contra repositório em memória + stub de uso em editais.
 */
describe('ExcluirMaterialServico (UC020)', () => {
  let repo: CatalogoRepositoryMemory<MaterialServico>;
  let bus: InMemoryEventBus;
  let usados: Set<string>;
  let excluir: ExcluirMaterialServico;
  const actor = { userId: 'smga1' };
  const eventos: string[] = [];

  beforeEach(() => {
    repo = new CatalogoRepositoryMemory<MaterialServico>();
    bus = new InMemoryEventBus();
    eventos.length = 0;
    bus.subscribe('CatalogoItemExcluido', async (e) => { eventos.push(e.eventName); });
    usados = new Set<string>();
    excluir = new ExcluirMaterialServico(repo, { usadoEmAlgumEdital: async (id) => usados.has(id) }, bus);
  });

  async function semear(id: string, ativo: boolean): Promise<void> {
    const m = MaterialServico.criar({ id, numero: `ITM-2026/${id}`, nome: `Item ${id}`, unidades: ['un'], userName: 'seed' });
    if (!ativo) m.inativar('seed');
    await repo.salvar(m);
  }

  it('exclui um material INATIVO sem vínculo e registra na trilha (AD-18)', async () => {
    await semear('1', false);
    await excluir.excluir('1', actor);
    expect(await repo.porId('1')).toBeNull();
    expect(eventos).toContain('CatalogoItemExcluido');
  });

  it('recusa excluir material ATIVO → MaterialAtivoNaoExcluivel', async () => {
    await semear('2', true);
    await expect(excluir.excluir('2', actor)).rejects.toThrow(MaterialAtivoNaoExcluivel);
    expect(await repo.porId('2')).not.toBeNull();
    expect(eventos).toHaveLength(0);
  });

  it('recusa excluir material vinculado a algum edital → MaterialVinculadoAEdital', async () => {
    await semear('3', false);
    usados.add('3'); // referenciado por um edital
    await expect(excluir.excluir('3', actor)).rejects.toThrow(MaterialVinculadoAEdital);
    expect(await repo.porId('3')).not.toBeNull();
  });

  it('material inexistente → MaterialNaoEncontrado', async () => {
    await expect(excluir.excluir('nao-existe', actor)).rejects.toThrow(MaterialNaoEncontrado);
  });
});
