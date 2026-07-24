import { describe, it, expect, beforeEach } from 'vitest';
import { ManterCatalogos, ChaveDuplicada, ItemCatalogoNaoEncontrado } from '../../src/catalogos/application/manter-catalogos.js';
import { CatalogoRepositoryMemory } from '../../src/catalogos/adapters/catalogo-repository-memory.js';
import type { Secretaria } from '../../src/catalogos/domain/secretaria.js';
import type { SetorCnae } from '../../src/catalogos/domain/setor-cnae.js';
import type { TipoDocumento } from '../../src/catalogos/domain/tipo-documento.js';
import type { UnidadeMedida } from '../../src/catalogos/domain/unidade-medida.js';
import { EmailInvalido, CampoObrigatorio } from '../../src/catalogos/domain/item-catalogo.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * UC020 — caso de uso ManterCatalogos (CrudCatalogo) contra repositórios em memória. Cobre unicidade
 * (RN015), inativação lógica (some das listas, idempotente), reativação e emissão de eventos de trilha.
 */
describe('ManterCatalogos (UC020)', () => {
  let manter: ManterCatalogos;
  let bus: InMemoryEventBus;
  const actor = { userId: 'admin1' };
  const eventos: string[] = [];

  beforeEach(() => {
    bus = new InMemoryEventBus();
    eventos.length = 0;
    for (const nome of ['CatalogoItemCriado', 'CatalogoItemEditado', 'CatalogoItemInativado', 'CatalogoItemReativado']) {
      bus.subscribe(nome, async (e) => { eventos.push(e.eventName); });
    }
    manter = new ManterCatalogos({
      secretarias: new CatalogoRepositoryMemory<Secretaria>(),
      setores: new CatalogoRepositoryMemory<SetorCnae>(),
      tiposDocumento: new CatalogoRepositoryMemory<TipoDocumento>(),
      unidadesMedida: new CatalogoRepositoryMemory<UnidadeMedida>(),
    }, bus);
  });

  it('unidade de medida: cria com símbolo + descrição e lista', async () => {
    const { id } = await manter.unidadesMedida.criar({ simbolo: 'kg', descricao: 'Quilograma' }, actor);
    const lista = await manter.unidadesMedida.listar();
    expect(lista.map((u) => u.id)).toContain(id);
    expect(eventos).toContain('CatalogoItemCriado');
  });

  it('unidade de medida: bloqueia símbolo duplicado (case-insensitive) — RN015', async () => {
    await manter.unidadesMedida.criar({ simbolo: 'un', descricao: 'Unidade' }, actor);
    await expect(manter.unidadesMedida.criar({ simbolo: 'UN', descricao: 'Unidade (dup)' }, actor))
      .rejects.toThrow(ChaveDuplicada);
  });

  it('unidade de medida: símbolo e descrição são obrigatórios', async () => {
    await expect(manter.unidadesMedida.criar({ simbolo: '  ', descricao: 'Sem símbolo' }, actor)).rejects.toThrow(CampoObrigatorio);
    await expect(manter.unidadesMedida.criar({ simbolo: 'l', descricao: '' }, actor)).rejects.toThrow(CampoObrigatorio);
  });

  it('unidade de medida: inativar remove da lista padrão; reativar recoloca', async () => {
    const { id } = await manter.unidadesMedida.criar({ simbolo: 'm²', descricao: 'Metro quadrado' }, actor);
    await manter.unidadesMedida.inativar(id, actor);
    expect((await manter.unidadesMedida.listar()).map((u) => u.id)).not.toContain(id);
    await manter.unidadesMedida.reativar(id, actor);
    expect((await manter.unidadesMedida.listar()).map((u) => u.id)).toContain(id);
  });

  it('cria uma secretaria ativa e emite CatalogoItemCriado', async () => {
    const { id } = await manter.secretarias.criar({ nome: 'Educação', sigla: 'SME', responsavel: 'Ana' }, actor);
    const lista = await manter.secretarias.listar();
    expect(lista.map((s) => s.id)).toContain(id);
    expect(eventos).toContain('CatalogoItemCriado');
  });

  it('secretaria: guarda o e-mail de contato (normalizado) e permite editá-lo; contato é opcional', async () => {
    const { id } = await manter.secretarias.criar({ nome: 'Educação', sigla: 'SME', responsavel: 'Ana', contato: 'Educacao@RioBranco.AC.gov.br' }, actor);
    expect((await manter.secretarias.porId(id))?.contato).toBe('educacao@riobranco.ac.gov.br'); // trim + lower

    await manter.secretarias.editar(id, { contato: 'nova@riobranco.ac.gov.br' }, actor);
    expect((await manter.secretarias.porId(id))?.contato).toBe('nova@riobranco.ac.gov.br');

    // Opcional: jornada UC020 (sem contato) continua válida.
    const semContato = await manter.secretarias.criar({ nome: 'Obras', sigla: 'SEMOB', responsavel: 'Beto' }, actor);
    expect((await manter.secretarias.porId(semContato.id))?.contato).toBeUndefined();
  });

  it('secretaria: e-mail de contato inválido → EmailInvalido', async () => {
    await expect(manter.secretarias.criar({ nome: 'Saúde', sigla: 'SMS', responsavel: 'C', contato: 'nao-e-email' }, actor))
      .rejects.toThrow(EmailInvalido);
  });

  it('bloqueia sigla duplicada (case-insensitive) — RN015 "duplicidade → bloqueado"', async () => {
    await manter.secretarias.criar({ nome: 'Educação', sigla: 'SME', responsavel: 'Ana' }, actor);
    await expect(manter.secretarias.criar({ nome: 'Meio Ambiente', sigla: 'sme', responsavel: 'Beto' }, actor))
      .rejects.toThrow(ChaveDuplicada);
  });

  it('editar não pode colidir com a chave de outro item', async () => {
    await manter.setores.criar({ codigo: '1091101', descricao: 'Panificação' }, actor);
    const { id } = await manter.setores.criar({ codigo: '1092900', descricao: 'Biscoitos' }, actor);
    await expect(manter.setores.editar(id, { codigo: '1091101' }, actor)).rejects.toThrow(ChaveDuplicada);
  });

  it('inativação lógica esconde das listas mas mantém acessível; é idempotente e reversível (RN015)', async () => {
    const { id } = await manter.secretarias.criar({ nome: 'Saúde', sigla: 'SMS', responsavel: 'Célia' }, actor);
    await manter.secretarias.inativar(id, actor);
    expect((await manter.secretarias.listar()).map((s) => s.id)).not.toContain(id); // some das listas de seleção
    expect((await manter.secretarias.listar({ incluirInativos: true })).map((s) => s.id)).toContain(id);
    expect(await manter.secretarias.porId(id)).not.toBeNull(); // vínculos históricos preservados

    eventos.length = 0;
    await manter.secretarias.inativar(id, actor); // idempotente: sem novo evento
    expect(eventos).toHaveLength(0);

    await manter.secretarias.reativar(id, actor);
    expect((await manter.secretarias.listar()).map((s) => s.id)).toContain(id);
    expect(eventos).toContain('CatalogoItemReativado');
  });

  it('reusar a chave = reativar o existente (unicidade global bloqueia recriar)', async () => {
    const { id } = await manter.setores.criar({ codigo: '4711302', descricao: 'Supermercados' }, actor);
    await manter.setores.inativar(id, actor);
    await expect(manter.setores.criar({ codigo: '4711302', descricao: 'Supermercados v2' }, actor))
      .rejects.toThrow(ChaveDuplicada);
  });

  it('editar/inativar item inexistente → ItemCatalogoNaoEncontrado', async () => {
    await expect(manter.tiposDocumento.editar('nope', { nome: 'x' }, actor)).rejects.toThrow(ItemCatalogoNaoEncontrado);
    await expect(manter.tiposDocumento.inativar('nope', actor)).rejects.toThrow(ItemCatalogoNaoEncontrado);
  });

  it('tipos de documento: cria com flags e edita categoria', async () => {
    const { id } = await manter.tiposDocumento.criar(
      { nome: 'Balanço', formato: 'pdf', categoria: 'fiscal', exigeExercicio: true }, actor);
    await manter.tiposDocumento.editar(id, { categoria: 'cadastral' }, actor);
    const t = await manter.tiposDocumento.porId(id);
    expect(t?.categoria).toBe('cadastral');
    expect(t?.exigeExercicio).toBe(true);
  });

  it('tipos de documento: valida prazo de validade em dias e persiste (RF022)', async () => {
    const { id } = await manter.tiposDocumento.criar(
      { nome: 'Certidão FGTS', formato: 'pdf', categoria: 'fiscal', exigeValidade: true, validadeDias: 30 }, actor);
    expect((await manter.tiposDocumento.porId(id))?.validadeDias).toBe(30);
    await manter.tiposDocumento.editar(id, { validadeDias: 90 }, actor);
    expect((await manter.tiposDocumento.porId(id))?.validadeDias).toBe(90);
  });
});
