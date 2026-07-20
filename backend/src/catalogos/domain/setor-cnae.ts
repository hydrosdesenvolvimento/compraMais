import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { ItemCatalogo, type SituacaoCatalogo, type CampoDiff, normalizarChave, exigirTexto, textoOpcional } from './item-catalogo.js';

export interface SetorCnaeState {
  meta: MetadadosBase;
  codigo: string;
  descricao: string;
  categoria?: string;
  situacao: SituacaoCatalogo;
}

export class CnaeInvalido extends Error {
  constructor(codigo: string) { super(`Invalid CNAE code: '${codigo}' (expected a 7-digit subclass).`); this.name = 'CnaeInvalido'; }
}

/** Valida a subclasse CNAE de 7 dígitos (RF021/RF003/RN001 — mesma regra do match da vitrine). */
function exigirCnae(codigo: string): string {
  const c = exigirTexto(codigo, 'codigo');
  if (!/^\d{7}$/.test(c)) throw new CnaeInvalido(codigo);
  return c;
}

/**
 * Setor / CNAE (RF021). Chave natural = **código** (subclasse 7 dígitos). Base do "CNAE exigido" do
 * edital e do match do fornecedor (RF003/RN001). Inativação lógica preserva os editais que já o exigiram.
 */
export class SetorCnae extends ItemCatalogo {
  private constructor(
    meta: MetadadosBase,
    private _codigo: string,
    private _descricao: string,
    private _categoria: string | undefined,
    situacao: SituacaoCatalogo,
  ) { super(meta, situacao); }

  static criar(input: { id: string; codigo: string; descricao: string; categoria?: string; userName?: string }): SetorCnae {
    return new SetorCnae(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirCnae(input.codigo),
      exigirTexto(input.descricao, 'descricao'),
      textoOpcional(input.categoria),
      'ativo',
    );
  }

  static deEstado(s: SetorCnaeState): SetorCnae {
    return new SetorCnae(s.meta, s.codigo, s.descricao, s.categoria, s.situacao);
  }

  estado(): SetorCnaeState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      codigo: this._codigo, descricao: this._descricao, categoria: this._categoria, situacao: this._situacao,
    };
  }

  get codigo(): string { return this._codigo; }
  get descricao(): string { return this._descricao; }
  get categoria(): string | undefined { return this._categoria; }
  chave(): string { return normalizarChave(this._codigo); }

  editar(campos: Partial<{ codigo: string; descricao: string; categoria: string }>, userName: string): CampoDiff[] {
    const diff: CampoDiff[] = [];
    if (campos.codigo !== undefined) {
      const novo = exigirCnae(campos.codigo);
      if (novo !== this._codigo) { diff.push({ campo: 'codigo', antes: this._codigo, depois: novo }); this._codigo = novo; }
    }
    if (campos.descricao !== undefined) {
      const novo = exigirTexto(campos.descricao, 'descricao');
      if (novo !== this._descricao) { diff.push({ campo: 'descricao', antes: this._descricao, depois: novo }); this._descricao = novo; }
    }
    if (campos.categoria !== undefined) {
      const novo = textoOpcional(campos.categoria);
      if (novo !== this._categoria) { diff.push({ campo: 'categoria', antes: this._categoria, depois: novo }); this._categoria = novo; }
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return diff;
  }
}
