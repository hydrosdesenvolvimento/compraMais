import { randomUUID } from 'node:crypto';
import type { ItemCatalogo, CampoDiff } from '../domain/item-catalogo.js';
import { Secretaria } from '../domain/secretaria.js';
import { SetorCnae } from '../domain/setor-cnae.js';
import { TipoDocumento } from '../domain/tipo-documento.js';
import { MaterialServico, formatarNumeroItem, type TipoItem } from '../domain/material-servico.js';
import { NumeradorItensMemory, type NumeradorItens } from './numerador-itens.js';
import type { CatalogoRepository, FiltroListagem } from './catalogo-repository.js';
import {
  CatalogoItemCriado, CatalogoItemEditado, CatalogoItemInativado, CatalogoItemReativado, type NomeCatalogo,
} from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { DomainEventEnvelope } from '../../shared/events/domain-event.js';

type Actor = { userId: string; empresaId?: string };

export class ItemCatalogoNaoEncontrado extends Error {
  constructor(catalogo: NomeCatalogo, id: string) { super(`Catalog item not found: ${catalogo}/${id}.`); this.name = 'ItemCatalogoNaoEncontrado'; }
}
export class ChaveDuplicada extends Error {
  constructor(catalogo: NomeCatalogo, chave: string) { super(`Duplicate key in ${catalogo}: '${chave}'.`); this.name = 'ChaveDuplicada'; }
}

/**
 * Serviço CRUD genérico de um catálogo (UC020). Concentra o que é comum aos três catálogos: geração de id,
 * checagem de **unicidade** (RN015 — "duplicidade de chave → bloqueado"), **inativação lógica** (RN015) e
 * publicação dos eventos de trilha (AD-18). A construção/edição da entidade fica no `CatalogoDef` (cada
 * catálogo conhece seus campos e sua chave natural).
 */
export interface CatalogoDef<T extends ItemCatalogo, TCriar, TEditar> {
  nome: NomeCatalogo;
  /** Síncrono na maioria dos catálogos; assíncrono quando a construção depende de I/O (ex.: reservar o
   *  número sequencial do item de materiais/serviços). O CrudCatalogo aguarda o resultado nos dois casos. */
  criar(id: string, input: TCriar, userName: string): T | Promise<T>;
  aplicarEdicao(item: T, campos: TEditar, userName: string): CampoDiff[];
}

export class CrudCatalogo<T extends ItemCatalogo, TCriar, TEditar> {
  constructor(
    private readonly repo: CatalogoRepository<T>,
    private readonly def: CatalogoDef<T, TCriar, TEditar>,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  /** Devolve a entidade criada (não só o id): a borda serializa a view completa — o item de materiais e
   *  serviços precisa expor o `numero` gerado na própria resposta do POST. Quem só usa `{ id }` segue
   *  funcionando, pois `id` é campo da entidade. */
  async criar(input: TCriar, actor: Actor): Promise<T> {
    const item = await this.def.criar(randomUUID(), input, actor.userId);
    await this.exigirChaveLivre(item.chave(), item.id);
    await this.repo.salvar(item);
    await this.publicar(new CatalogoItemCriado(item.id, { catalogo: this.def.nome, itemId: item.id, chave: item.chave() }, actor));
    return item;
  }

  async editar(id: string, campos: TEditar, actor: Actor): Promise<void> {
    const item = await this.exigir(id);
    const diff = this.def.aplicarEdicao(item, campos, actor.userId);
    if (diff.length === 0) return;
    await this.exigirChaveLivre(item.chave(), item.id); // pode ter mudado a chave natural
    await this.repo.salvar(item);
    await this.publicar(new CatalogoItemEditado(item.id, { catalogo: this.def.nome, itemId: item.id, diff }, actor));
  }

  /** Exclusão lógica (RN015): idempotente; só emite/persiste quando houve transição real. */
  async inativar(id: string, actor: Actor): Promise<void> {
    const item = await this.exigir(id);
    if (!item.ativo) return;
    item.inativar(actor.userId);
    await this.repo.salvar(item);
    await this.publicar(new CatalogoItemInativado(item.id, { catalogo: this.def.nome, itemId: item.id }, actor));
  }

  async reativar(id: string, actor: Actor): Promise<void> {
    const item = await this.exigir(id);
    if (item.ativo) return;
    item.reativar(actor.userId);
    await this.repo.salvar(item);
    await this.publicar(new CatalogoItemReativado(item.id, { catalogo: this.def.nome, itemId: item.id }, actor));
  }

  listar(filtro?: FiltroListagem): Promise<T[]> { return this.repo.listar(filtro); }
  porId(id: string): Promise<T | null> { return this.repo.porId(id); }

  private async exigir(id: string): Promise<T> {
    const item = await this.repo.porId(id);
    if (!item) throw new ItemCatalogoNaoEncontrado(this.def.nome, id);
    return item;
  }

  private async exigirChaveLivre(chave: string, idAtual: string): Promise<void> {
    const conflito = await this.repo.porChave(chave);
    if (conflito && conflito.id !== idAtual) throw new ChaveDuplicada(this.def.nome, chave);
  }

  private publicar(ev: { toEnvelope(id: string, at: string): DomainEventEnvelope }): Promise<void> {
    return this.bus.publish(ev.toEnvelope(randomUUID(), this.now()));
  }
}

/** Entradas de criação/edição por catálogo. */
export type CriarMaterialServico = { nome: string; tipo?: TipoItem; especificacoes?: string; unidades?: string[] };
export type EditarMaterialServico = Partial<CriarMaterialServico>;
export type CriarSecretaria = { nome: string; sigla: string; responsavel: string; contato?: string };
export type EditarSecretaria = Partial<CriarSecretaria>;
export type CriarSetor = { codigo: string; descricao: string; categoria?: string };
export type EditarSetor = Partial<CriarSetor>;
export type CriarTipoDoc = { nome: string; formato: string; categoria: string; exigeValidade?: boolean; exigeExercicio?: boolean; validadeDias?: number; obrigatorio?: boolean };
export type EditarTipoDoc = Partial<CriarTipoDoc>;

/**
 * Fachada da jornada única de catálogos (UC020: "uma jornada, três catálogos"). Compõe um `CrudCatalogo`
 * por catálogo, cada um com sua definição de construção/edição. Wiring simples no composition root.
 */
export class ManterCatalogos {
  readonly secretarias: CrudCatalogo<Secretaria, CriarSecretaria, EditarSecretaria>;
  readonly setores: CrudCatalogo<SetorCnae, CriarSetor, EditarSetor>;
  readonly tiposDocumento: CrudCatalogo<TipoDocumento, CriarTipoDoc, EditarTipoDoc>;
  readonly materiaisServicos: CrudCatalogo<MaterialServico, CriarMaterialServico, EditarMaterialServico>;

  constructor(
    repos: {
      secretarias: CatalogoRepository<Secretaria>;
      setores: CatalogoRepository<SetorCnae>;
      tiposDocumento: CatalogoRepository<TipoDocumento>;
      materiaisServicos: CatalogoRepository<MaterialServico>;
    },
    bus: EventBus,
    now: () => string = () => new Date().toISOString(),
    numerador: NumeradorItens = new NumeradorItensMemory(),
  ) {
    this.secretarias = new CrudCatalogo<Secretaria, CriarSecretaria, EditarSecretaria>(repos.secretarias, {
      nome: 'secretaria',
      criar: (id, input, userName) => Secretaria.criar({ id, ...input, userName }),
      aplicarEdicao: (item, campos, userName) => item.editar(campos, userName),
    }, bus, now);

    this.setores = new CrudCatalogo<SetorCnae, CriarSetor, EditarSetor>(repos.setores, {
      nome: 'setor-cnae',
      criar: (id, input, userName) => SetorCnae.criar({ id, ...input, userName }),
      aplicarEdicao: (item, campos, userName) => item.editar(campos, userName),
    }, bus, now);

    this.tiposDocumento = new CrudCatalogo<TipoDocumento, CriarTipoDoc, EditarTipoDoc>(repos.tiposDocumento, {
      nome: 'tipo-documento',
      criar: (id, input, userName) => TipoDocumento.criar({ id, ...input, userName }),
      aplicarEdicao: (item, campos, userName) => item.editar(campos, userName),
    }, bus, now);

    // Único catálogo cuja construção é assíncrona: o número oficial (ITM-AAAA/NNN) é uma sequência
    // reservada atomicamente, não um dado do formulário. O ano vem do relógio injetado (`now`), para o
    // teste poder fixar a data sem depender do calendário da máquina.
    this.materiaisServicos = new CrudCatalogo<MaterialServico, CriarMaterialServico, EditarMaterialServico>(repos.materiaisServicos, {
      nome: 'material-servico',
      criar: async (id, input, userName) => {
        const ano = new Date(now()).getUTCFullYear();
        const numero = formatarNumeroItem(ano, await numerador.proximo(ano));
        return MaterialServico.criar({ id, numero, ...input, userName });
      },
      aplicarEdicao: (item, campos, userName) => item.editar(campos, userName),
    }, bus, now);
  }
}
