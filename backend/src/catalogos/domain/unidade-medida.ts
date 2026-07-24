import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { ItemCatalogo, type SituacaoCatalogo, type CampoDiff, normalizarChave, exigirTexto } from './item-catalogo.js';

export interface UnidadeMedidaState {
  meta: MetadadosBase;
  simbolo: string;
  descricao: string;
  situacao: SituacaoCatalogo;
}

/**
 * Unidade de Medida (UC020). Chave natural = **símbolo** (ex.: 'un', 'kg', 'm²', 'L', 'h', 'cx') —
 * a abreviação exibida nas quantidades. Alimenta o campo `unidades` dos itens de Materiais e Serviços
 * e a quantificação dos itens de edital. Exclusão lógica (RN015): a unidade inativada some das listas
 * mas preserva os vínculos históricos (itens/editais que já a usaram).
 */
export class UnidadeMedida extends ItemCatalogo {
  private constructor(
    meta: MetadadosBase,
    private _simbolo: string,
    private _descricao: string,
    situacao: SituacaoCatalogo,
  ) { super(meta, situacao); }

  static criar(input: { id: string; simbolo: string; descricao: string; userName?: string }): UnidadeMedida {
    return new UnidadeMedida(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirTexto(input.simbolo, 'simbolo'),
      exigirTexto(input.descricao, 'descricao'),
      'ativo',
    );
  }

  static deEstado(s: UnidadeMedidaState): UnidadeMedida {
    return new UnidadeMedida(s.meta, s.simbolo, s.descricao, s.situacao);
  }

  estado(): UnidadeMedidaState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      simbolo: this._simbolo, descricao: this._descricao, situacao: this._situacao,
    };
  }

  get simbolo(): string { return this._simbolo; }
  get descricao(): string { return this._descricao; }
  chave(): string { return normalizarChave(this._simbolo); }

  editar(campos: Partial<{ simbolo: string; descricao: string }>, userName: string): CampoDiff[] {
    const diff: CampoDiff[] = [];
    if (campos.simbolo !== undefined) {
      const novo = exigirTexto(campos.simbolo, 'simbolo');
      if (novo !== this._simbolo) { diff.push({ campo: 'simbolo', antes: this._simbolo, depois: novo }); this._simbolo = novo; }
    }
    if (campos.descricao !== undefined) {
      const novo = exigirTexto(campos.descricao, 'descricao');
      if (novo !== this._descricao) { diff.push({ campo: 'descricao', antes: this._descricao, depois: novo }); this._descricao = novo; }
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return diff;
  }
}
