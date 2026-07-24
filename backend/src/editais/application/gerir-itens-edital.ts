import { randomUUID } from 'node:crypto';
import { ItemEdital } from '../domain/item-edital.js';
import { ItemEditalAdicionado, ItemEditalRemovido } from '../domain/eventos.js';
import type { EditalRepository } from './listar-editais-compativeis.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Item do catálogo visto pelo caso de uso: só o que ele precisa para validar e tirar o snapshot. Qualquer
 * `MaterialServico` satisfaz este contrato estruturalmente (o server injeta o próprio repo do catálogo).
 */
export interface ItemCatalogoLookup {
  porId(id: string): Promise<{ nome: string; unidades: readonly string[]; especificacoes?: string; ativo: boolean } | null>;
}

/** Porta de persistência dos itens do edital (adaptadores memory/pg). */
export interface ItemEditalRepository {
  salvar(item: ItemEdital): Promise<void>;
  porId(id: string): Promise<ItemEdital | null>;
  listarDoEdital(editalId: string): Promise<ItemEdital[]>;
  remover(id: string): Promise<void>;
  /** Já existe um item deste item-de-catálogo no edital? (unicidade — regra da referência). */
  existeCatalogoNoEdital(editalId: string, itemCatalogoId: string): Promise<boolean>;
  /** O item de catálogo está referenciado por ALGUM edital (qualquer um)? Base da exclusão do material. */
  usadoEmAlgumEdital(itemCatalogoId: string): Promise<boolean>;
  /** Próximo número sequencial do edital (maior número já usado + 1; 1 se vazio). */
  proximoNumero(editalId: string): Promise<number>;
}

export class EditalNaoEncontradoItens extends Error {
  constructor() { super('Edital not found.'); this.name = 'EditalNaoEncontrado'; }
}
export class EditalNaoEditavel extends Error {
  constructor() { super('Items can only be changed while the edital is a draft (rascunho).'); this.name = 'EditalNaoEditavel'; }
}
export class ItemCatalogoNaoEncontrado extends Error {
  constructor() { super('Catalog item not found.'); this.name = 'ItemCatalogoNaoEncontrado'; }
}
export class ItemCatalogoInativo extends Error {
  constructor() { super('Catalog item is inactive/unavailable.'); this.name = 'ItemCatalogoInativo'; }
}
export class UnidadeIndisponivel extends Error {
  constructor(unidade: string, opcoes: readonly string[]) {
    super(`Unit '${unidade}' not available for this item. Options: ${opcoes.join(', ') || '—'}.`);
    this.name = 'UnidadeIndisponivel';
  }
}
export class ItemDuplicado extends Error {
  constructor() { super('This catalog item is already in the edital.'); this.name = 'ItemDuplicado'; }
}
export class ItemEditalNaoEncontrado extends Error {
  constructor() { super('Edital item not found.'); this.name = 'ItemEditalNaoEncontrado'; }
}

export interface ItemEditalView {
  id: string;
  editalId: string;
  numero: number;
  itemCatalogoId: string;
  nome: string;
  descricao: string | null;
  unidade: string;
  quantidade: number;
  precoTeto: number;
}

/**
 * Cadastro dos itens de um edital a partir do catálogo de materiais e serviços (UC020), **sem lotes**.
 * Modelo adaptado de `comprac_api` (`adicionar-item-lote.use-case.ts`), removendo a camada de lote e as
 * integrações de cotação/mapa-de-preço (fora de escopo). Mantém as regras essenciais da referência:
 *  • o edital precisa existir e estar **editável** (rascunho — na referência, rascunho/suspenso);
 *  • o item de catálogo precisa existir e estar **ativo**;
 *  • a **unidade** escolhida precisa pertencer às unidades do item de catálogo;
 *  • não pode repetir o mesmo item de catálogo no edital.
 * O `nome`/`descrição` são gravados como **snapshot** (estáveis mesmo que o catálogo mude depois).
 *
 * ⚠️ Preço-teto é montante monetário: por RN013, NÃO deve ser exposto no portal público de transparência
 * (a projeção `Transparencia` só publica agregados — contagem de editais, secretarias, CNAEs — e não
 * toca itens; manter assim).
 */
export class GerirItensEdital {
  constructor(
    private readonly editais: EditalRepository,
    private readonly catalogo: ItemCatalogoLookup,
    private readonly repo: ItemEditalRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async adicionar(
    editalId: string,
    input: { itemCatalogoId: string; unidade: string; quantidade: number; precoTeto: number },
    actor: Actor,
  ): Promise<{ id: string; numero: number }> {
    const edital = await this.editais.porId(editalId);
    if (!edital) throw new EditalNaoEncontradoItens();
    if (edital.situacao !== 'rascunho') throw new EditalNaoEditavel();

    const produto = await this.catalogo.porId(input.itemCatalogoId);
    if (!produto) throw new ItemCatalogoNaoEncontrado();
    if (!produto.ativo) throw new ItemCatalogoInativo();
    if (!produto.unidades.includes(input.unidade)) throw new UnidadeIndisponivel(input.unidade, produto.unidades);
    if (await this.repo.existeCatalogoNoEdital(editalId, input.itemCatalogoId)) throw new ItemDuplicado();

    const numero = await this.repo.proximoNumero(editalId);
    const item = ItemEdital.criar({
      id: randomUUID(), editalId, numero, itemCatalogoId: input.itemCatalogoId,
      nomeSnapshot: produto.nome, descricaoSnapshot: produto.especificacoes ?? null,
      unidade: input.unidade, quantidade: input.quantidade, precoTeto: input.precoTeto, userName: actor.userId,
    });
    await this.repo.salvar(item);
    await this.bus.publish(new ItemEditalAdicionado(item.id, { editalId, itemId: item.id, itemCatalogoId: input.itemCatalogoId, numero }, actor).toEnvelope(randomUUID(), this.now()));
    return { id: item.id, numero };
  }

  async listar(editalId: string): Promise<ItemEditalView[]> {
    const itens = await this.repo.listarDoEdital(editalId);
    return itens.map((i) => ({
      id: i.id, editalId: i.editalId, numero: i.numero, itemCatalogoId: i.itemCatalogoId,
      nome: i.nomeSnapshot, descricao: i.descricaoSnapshot, unidade: i.unidade,
      quantidade: i.quantidade, precoTeto: i.precoTeto,
    }));
  }

  async remover(editalId: string, itemId: string, actor: Actor): Promise<void> {
    const edital = await this.editais.porId(editalId);
    if (!edital) throw new EditalNaoEncontradoItens();
    if (edital.situacao !== 'rascunho') throw new EditalNaoEditavel();

    const item = await this.repo.porId(itemId);
    if (!item || item.editalId !== editalId) throw new ItemEditalNaoEncontrado();

    await this.repo.remover(itemId);
    await this.bus.publish(new ItemEditalRemovido(itemId, { editalId, itemId }, actor).toEnvelope(randomUUID(), this.now()));
  }
}
