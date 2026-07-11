import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import { ItemCatalogo, type SituacaoCatalogo, type CampoDiff, normalizarChave, exigirTexto } from './item-catalogo.js';

/** Snapshot plano do agregado para persistência (AD-33). O adaptador grava/lê exatamente este formato. */
export interface SecretariaState {
  meta: MetadadosBase;
  nome: string;
  sigla: string;
  responsavel: string;
  situacao: SituacaoCatalogo;
}

/**
 * Secretaria demandante (RF020 / AD-16). Chave natural = **sigla** (case-insensitive). Selecionável na
 * criação de editais (1 Edital → 1 Secretaria). Inativação lógica preserva os editais que já a vincularam.
 */
export class Secretaria extends ItemCatalogo {
  private constructor(
    meta: MetadadosBase,
    private _nome: string,
    private _sigla: string,
    private _responsavel: string,
    situacao: SituacaoCatalogo,
  ) { super(meta, situacao); }

  static criar(input: { id: string; nome: string; sigla: string; responsavel: string; userName?: string }): Secretaria {
    return new Secretaria(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirTexto(input.nome, 'nome'),
      exigirTexto(input.sigla, 'sigla'),
      exigirTexto(input.responsavel, 'responsavel'),
      'ativo',
    );
  }

  static deEstado(s: SecretariaState): Secretaria {
    return new Secretaria(s.meta, s.nome, s.sigla, s.responsavel, s.situacao);
  }

  estado(): SecretariaState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      nome: this._nome, sigla: this._sigla, responsavel: this._responsavel, situacao: this._situacao,
    };
  }

  get nome(): string { return this._nome; }
  get sigla(): string { return this._sigla; }
  get responsavel(): string { return this._responsavel; }
  chave(): string { return normalizarChave(this._sigla); }

  /** Edição auditada: aplica os campos informados e devolve o diff antes/depois (AD-18). */
  editar(campos: Partial<{ nome: string; sigla: string; responsavel: string }>, userName: string): CampoDiff[] {
    const diff: CampoDiff[] = [];
    if (campos.nome !== undefined) {
      const novo = exigirTexto(campos.nome, 'nome');
      if (novo !== this._nome) { diff.push({ campo: 'nome', antes: this._nome, depois: novo }); this._nome = novo; }
    }
    if (campos.sigla !== undefined) {
      const novo = exigirTexto(campos.sigla, 'sigla');
      if (novo !== this._sigla) { diff.push({ campo: 'sigla', antes: this._sigla, depois: novo }); this._sigla = novo; }
    }
    if (campos.responsavel !== undefined) {
      const novo = exigirTexto(campos.responsavel, 'responsavel');
      if (novo !== this._responsavel) { diff.push({ campo: 'responsavel', antes: this._responsavel, depois: novo }); this._responsavel = novo; }
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return diff;
  }
}
