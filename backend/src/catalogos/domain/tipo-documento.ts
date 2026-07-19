import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { ItemCatalogo, type SituacaoCatalogo, type CampoDiff, normalizarChave, exigirTexto, inteiroPositivoOpcional } from './item-catalogo.js';

/** Categoria de retenção legal (RN015/UC017): o que não pode ser apagado é inativado por categoria. */
export type CategoriaDocumento = 'cadastral' | 'fiscal' | 'contratual';
const CATEGORIAS: readonly CategoriaDocumento[] = ['cadastral', 'fiscal', 'contratual'];

export interface TipoDocumentoState {
  meta: MetadadosBase;
  nome: string;
  formato: string;
  categoria: CategoriaDocumento;
  exigeValidade: boolean;
  exigeExercicio: boolean;
  validadeDias?: number;
  situacao: SituacaoCatalogo;
}

export class CategoriaInvalida extends Error {
  constructor(v: string) { super(`Invalid category: '${v}' (expected cadastral | fiscal | contratual).`); this.name = 'CategoriaInvalida'; }
}

function exigirCategoria(v: string): CategoriaDocumento {
  const c = exigirTexto(v, 'categoria').toLowerCase();
  if (!CATEGORIAS.includes(c as CategoriaDocumento)) throw new CategoriaInvalida(v);
  return c as CategoriaDocumento;
}

/**
 * Tipo de Documento (RF022). Chave natural = **nome** (case-insensitive). Parametriza o upload (RF002)
 * e a covalidação (RF004): `formato` aceito, `exigeValidade` (certidões — RF009/UC013), `exigeExercicio`
 * (Balanço do exercício — RN006), `validadeDias` (prazo fixo de validade em dias — protótipo "90 dias")
 * e `categoria` (retenção legal por categoria — RN015/UC017). `validadeDias` é opcional e independente:
 * quando presente implica `exigeValidade`, mas a UI pode exigir validade sem prazo fixo (`exigeValidade`
 * sem `validadeDias`).
 */
export class TipoDocumento extends ItemCatalogo {
  private constructor(
    meta: MetadadosBase,
    private _nome: string,
    private _formato: string,
    private _categoria: CategoriaDocumento,
    private _exigeValidade: boolean,
    private _exigeExercicio: boolean,
    private _validadeDias: number | undefined,
    situacao: SituacaoCatalogo,
  ) { super(meta, situacao); }

  static criar(input: {
    id: string; nome: string; formato: string; categoria: string;
    exigeValidade?: boolean; exigeExercicio?: boolean; validadeDias?: number; userName?: string;
  }): TipoDocumento {
    return new TipoDocumento(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirTexto(input.nome, 'nome'),
      exigirTexto(input.formato, 'formato').toLowerCase(),
      exigirCategoria(input.categoria),
      input.exigeValidade ?? false,
      input.exigeExercicio ?? false,
      inteiroPositivoOpcional(input.validadeDias, 'validadeDias'),
      'ativo',
    );
  }

  static deEstado(s: TipoDocumentoState): TipoDocumento {
    return new TipoDocumento(s.meta, s.nome, s.formato, s.categoria, s.exigeValidade, s.exigeExercicio, s.validadeDias, s.situacao);
  }

  estado(): TipoDocumentoState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      nome: this._nome, formato: this._formato, categoria: this._categoria,
      exigeValidade: this._exigeValidade, exigeExercicio: this._exigeExercicio, validadeDias: this._validadeDias,
      situacao: this._situacao,
    };
  }

  get nome(): string { return this._nome; }
  get formato(): string { return this._formato; }
  get categoria(): CategoriaDocumento { return this._categoria; }
  get exigeValidade(): boolean { return this._exigeValidade; }
  get exigeExercicio(): boolean { return this._exigeExercicio; }
  get validadeDias(): number | undefined { return this._validadeDias; }
  chave(): string { return normalizarChave(this._nome); }

  editar(campos: Partial<{ nome: string; formato: string; categoria: string; exigeValidade: boolean; exigeExercicio: boolean; validadeDias: number }>, userName: string): CampoDiff[] {
    const diff: CampoDiff[] = [];
    if (campos.nome !== undefined) {
      const novo = exigirTexto(campos.nome, 'nome');
      if (novo !== this._nome) { diff.push({ campo: 'nome', antes: this._nome, depois: novo }); this._nome = novo; }
    }
    if (campos.formato !== undefined) {
      const novo = exigirTexto(campos.formato, 'formato').toLowerCase();
      if (novo !== this._formato) { diff.push({ campo: 'formato', antes: this._formato, depois: novo }); this._formato = novo; }
    }
    if (campos.categoria !== undefined) {
      const novo = exigirCategoria(campos.categoria);
      if (novo !== this._categoria) { diff.push({ campo: 'categoria', antes: this._categoria, depois: novo }); this._categoria = novo; }
    }
    if (campos.exigeValidade !== undefined && campos.exigeValidade !== this._exigeValidade) {
      diff.push({ campo: 'exigeValidade', antes: this._exigeValidade, depois: campos.exigeValidade });
      this._exigeValidade = campos.exigeValidade;
    }
    if (campos.exigeExercicio !== undefined && campos.exigeExercicio !== this._exigeExercicio) {
      diff.push({ campo: 'exigeExercicio', antes: this._exigeExercicio, depois: campos.exigeExercicio });
      this._exigeExercicio = campos.exigeExercicio;
    }
    if (campos.validadeDias !== undefined) {
      const novo = inteiroPositivoOpcional(campos.validadeDias, 'validadeDias'); // '' / null → undefined (limpa o prazo)
      if (novo !== this._validadeDias) { diff.push({ campo: 'validadeDias', antes: this._validadeDias, depois: novo }); this._validadeDias = novo; }
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return diff;
  }
}
