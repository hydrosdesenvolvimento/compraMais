import { describe, it, expect, beforeEach } from 'vitest';
import { CatalogoRepositoryMemory } from '../../src/catalogos/adapters/catalogo-repository-memory.js';
import { TipoDocumento } from '../../src/catalogos/domain/tipo-documento.js';
import { TIPOS_DOCUMENTO_DE_SISTEMA } from '../../src/catalogos/domain/tipos-documento-baseline.js';
import {
  ExcluirTipoDocumento, TipoDocumentoNaoEncontrado, TipoDocumentoAtivoNaoExcluivel,
  TipoDocumentoEmUso, TipoDocumentoDeSistema,
} from '../../src/catalogos/application/excluir-tipo-documento.js';
import { TIPO_DOC_FOTO_RESPONSAVEL } from '../../src/biometria/domain/biometria.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * UC020 / RF022 — exclusão FÍSICA de um tipo de arquivo. Espelha as guardas de `ExcluirMaterialServico`
 * e acrescenta a guarda de tipo de sistema (a prova de vida do UC007 depende do nome do tipo).
 */
describe('ExcluirTipoDocumento (UC020 / RF022)', () => {
  let repo: CatalogoRepositoryMemory<TipoDocumento>;
  let bus: InMemoryEventBus;
  /** Nomes de tipo com documento enviado (chave do stub em minúsculas — o repo real compara case-insensitive). */
  let emUso: Set<string>;
  let excluir: ExcluirTipoDocumento;
  const actor = { userId: 'admin1' };
  const eventos: string[] = [];

  beforeEach(() => {
    repo = new CatalogoRepositoryMemory<TipoDocumento>();
    bus = new InMemoryEventBus();
    eventos.length = 0;
    bus.subscribe('CatalogoItemExcluido', async (e) => { eventos.push(e.eventName); });
    emUso = new Set<string>();
    excluir = new ExcluirTipoDocumento(
      repo,
      { usadoPorAlgumDocumento: async (nome) => emUso.has(nome.toLowerCase()) },
      bus,
    );
  });

  async function semear(id: string, nome: string, ativo: boolean): Promise<void> {
    const t = TipoDocumento.criar({ id, nome, formato: 'pdf', categoria: 'cadastral', userName: 'seed' });
    if (!ativo) t.inativar('seed');
    await repo.salvar(t);
  }

  it('exclui um tipo INATIVO e sem uso, e registra na trilha (AD-18)', async () => {
    await semear('1', 'Certidão Municipal', false);
    await excluir.excluir('1', actor);
    expect(await repo.porId('1')).toBeNull();
    expect(eventos).toContain('CatalogoItemExcluido');
  });

  it('recusa excluir tipo ATIVO → TipoDocumentoAtivoNaoExcluivel', async () => {
    await semear('2', 'Alvará de Funcionamento', true);
    await expect(excluir.excluir('2', actor)).rejects.toThrow(TipoDocumentoAtivoNaoExcluivel);
    expect(await repo.porId('2')).not.toBeNull();
    expect(eventos).toHaveLength(0);
  });

  it('recusa excluir tipo com documento já enviado → TipoDocumentoEmUso', async () => {
    await semear('3', 'Contrato Social', false);
    emUso.add('contrato social');
    await expect(excluir.excluir('3', actor)).rejects.toThrow(TipoDocumentoEmUso);
    expect(await repo.porId('3')).not.toBeNull();
  });

  it('recusa excluir tipo de SISTEMA mesmo inativo e sem uso → TipoDocumentoDeSistema', async () => {
    await semear('4', TIPO_DOC_FOTO_RESPONSAVEL, false);
    await expect(excluir.excluir('4', actor)).rejects.toThrow(TipoDocumentoDeSistema);
    expect(await repo.porId('4')).not.toBeNull();
  });

  it('a guarda de sistema é case-insensitive (chave natural do catálogo)', async () => {
    await semear('5', TIPO_DOC_FOTO_RESPONSAVEL.toUpperCase(), false);
    await expect(excluir.excluir('5', actor)).rejects.toThrow(TipoDocumentoDeSistema);
  });

  it('tipo de sistema tem precedência sobre a guarda de ativo (não induz a inativar à toa)', async () => {
    await semear('6', TIPO_DOC_FOTO_RESPONSAVEL, true);
    await expect(excluir.excluir('6', actor)).rejects.toThrow(TipoDocumentoDeSistema);
  });

  it('tipo inexistente → TipoDocumentoNaoEncontrado', async () => {
    await expect(excluir.excluir('nao-existe', actor)).rejects.toThrow(TipoDocumentoNaoEncontrado);
  });

  it('a lista de tipos de sistema cobre a foto do responsável (UC007) — trava contra drift', () => {
    expect(TIPOS_DOCUMENTO_DE_SISTEMA.map((n) => n.toLowerCase()))
      .toContain(TIPO_DOC_FOTO_RESPONSAVEL.toLowerCase());
  });
});
