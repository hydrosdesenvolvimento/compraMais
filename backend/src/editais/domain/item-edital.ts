import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';

/**
 * Snapshot plano do item do edital para persistência (AD-33). `precoTeto` é montante monetário em reais
 * (o adaptador pg usa `numeric(15,2)`); `descricaoSnapshot` pode ser nula (item de catálogo sem
 * especificações).
 */
export interface ItemEditalState {
  meta: MetadadosBase;
  editalId: string;
  numero: number; // sequencial dentro do edital
  itemCatalogoId: string;
  nomeSnapshot: string;
  descricaoSnapshot: string | null;
  unidade: string;
  quantidade: number;
  precoTeto: number;
}

export class QuantidadeInvalida extends Error {
  constructor(q: number) { super(`Invalid quantity: ${q} (expected a positive integer).`); this.name = 'QuantidadeInvalida'; }
}
export class PrecoInvalido extends Error {
  constructor(p: number) { super(`Invalid ceiling price: ${p} (expected a positive amount).`); this.name = 'PrecoInvalido'; }
}

function exigirQuantidade(q: number): number {
  if (!Number.isInteger(q) || q <= 0) throw new QuantidadeInvalida(q);
  return q;
}
function exigirPreco(p: number): number {
  if (!Number.isFinite(p) || p <= 0) throw new PrecoInvalido(p);
  // Duas casas (centavos) — coerente com numeric(15,2) do adaptador; evita ruído de ponto flutuante.
  return Math.round(p * 100) / 100;
}

/**
 * Item de um edital, escolhido do catálogo de materiais e serviços (UC020). Adaptado de `comprac_api`
 * (`item-lote-edital.ts` + `adicionar-item-lote.use-case.ts`) **sem a camada de lote**: o item acopla
 * direto ao edital.
 *
 * Como na referência, guarda um **snapshot** de `nome`/`descrição` do catálogo no momento da inclusão —
 * o item permanece estável mesmo que o item de catálogo seja editado/inativado depois. A validação de
 * que a `unidade` pertence às unidades do produto e de que o produto está ativo é feita no caso de uso
 * (`GerirItensEdital`), que tem acesso ao catálogo; o domínio garante quantidade e preço válidos.
 */
export class ItemEdital extends EntidadeBase {
  private constructor(
    meta: MetadadosBase,
    readonly editalId: string,
    readonly numero: number,
    readonly itemCatalogoId: string,
    readonly nomeSnapshot: string,
    readonly descricaoSnapshot: string | null,
    readonly unidade: string,
    readonly quantidade: number,
    readonly precoTeto: number,
  ) { super(meta); }

  static criar(input: {
    id: string; editalId: string; numero: number; itemCatalogoId: string;
    nomeSnapshot: string; descricaoSnapshot: string | null;
    unidade: string; quantidade: number; precoTeto: number; userName?: string;
  }): ItemEdital {
    return new ItemEdital(
      EntidadeBase.metaNova(input.id, input.userName),
      input.editalId, input.numero, input.itemCatalogoId,
      input.nomeSnapshot, input.descricaoSnapshot, input.unidade,
      exigirQuantidade(input.quantidade), exigirPreco(input.precoTeto),
    );
  }

  static deEstado(s: ItemEditalState): ItemEdital {
    return new ItemEdital(
      s.meta, s.editalId, s.numero, s.itemCatalogoId,
      s.nomeSnapshot, s.descricaoSnapshot, s.unidade, s.quantidade, s.precoTeto,
    );
  }

  estado(): ItemEditalState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      editalId: this.editalId, numero: this.numero, itemCatalogoId: this.itemCatalogoId,
      nomeSnapshot: this.nomeSnapshot, descricaoSnapshot: this.descricaoSnapshot,
      unidade: this.unidade, quantidade: this.quantidade, precoTeto: this.precoTeto,
    };
  }
}
