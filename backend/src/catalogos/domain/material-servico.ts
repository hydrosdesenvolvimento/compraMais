import { EntidadeBase, type MetadadosBase } from '../../shared/domain/entidade-base.js';
import {
  ItemCatalogo, type SituacaoCatalogo, type CampoDiff, normalizarChave, exigirTexto, textoOpcional,
} from './item-catalogo.js';

/** Natureza do item: bem material adquirido ou serviço contratado. */
export type TipoItem = 'material' | 'servico';

const TIPOS: readonly TipoItem[] = ['material', 'servico'];

export interface MaterialServicoState {
  meta: MetadadosBase;
  numero: string;
  nome: string;
  tipo: TipoItem;
  especificacoes?: string;
  unidades: string[];
  situacao: SituacaoCatalogo;
}

export class TipoInvalido extends Error {
  constructor(tipo: string) { super(`Invalid item type: '${tipo}' (expected 'material' or 'servico').`); this.name = 'TipoInvalido'; }
}
export class UnidadeObrigatoria extends Error {
  constructor() { super('At least one unit of measure is required.'); this.name = 'UnidadeObrigatoria'; }
}
export class NumeroItemInvalido extends Error {
  constructor(seq: number) { super(`Invalid catalog item sequence: ${seq}.`); this.name = 'NumeroItemInvalido'; }
}

/**
 * Numeração oficial do item de catálogo — `ITM-AAAA/NNN`. Mesmo formato de `ED-AAAA/NNN` (UC005): o
 * sequencial reinicia por ano e é zero-padded a 3 dígitos, **sem truncar** acima de 999 (o 1000º item do
 * ano vira `ITM-AAAA/1000`, não `ITM-AAAA/000`). Difere de propósito do `ITM-AAAA-NNN` do `comprac_api`:
 * dentro deste projeto a consistência com o número do edital vale mais que a cópia literal da referência.
 */
export function formatarNumeroItem(ano: number, sequencial: number): string {
  if (!Number.isInteger(sequencial) || sequencial <= 0) throw new NumeroItemInvalido(sequencial);
  return `ITM-${ano}/${String(sequencial).padStart(3, '0')}`;
}

function exigirTipo(tipo: string | undefined): TipoItem {
  const t = (tipo ?? 'material').trim().toLowerCase();
  if (!(TIPOS as readonly string[]).includes(t)) throw new TipoInvalido(String(tipo));
  return t as TipoItem;
}

/**
 * Normaliza a lista de unidades de medida: apara espaços, descarta vazios e remove duplicatas
 * (case-insensitive, preservando a primeira grafia informada). Lista vazia → UnidadeObrigatoria:
 * um item sem unidade não é cotável nem distribuível.
 */
function exigirUnidades(unidades: readonly string[] | undefined): string[] {
  const vistas = new Set<string>();
  const limpas: string[] = [];
  for (const u of unidades ?? []) {
    const t = (u ?? '').trim();
    if (!t) continue;
    const chave = t.toLowerCase();
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    limpas.push(t);
  }
  if (limpas.length === 0) throw new UnidadeObrigatoria();
  return limpas;
}

/**
 * Item do Catálogo de Materiais e Serviços (4º catálogo de UC020). Modelo derivado do `comprac_api`
 * (`src/domain/catalogo/item-catalogo.ts`): número, nome, especificações técnicas, unidades e tipo
 * Material|Serviço.
 *
 * Duas adaptações deliberadas à referência:
 *  • o par `status` (Ativo|Pendente) + `ativo` da referência vira a `situacao` única da base
 *    `ItemCatalogo` (RN015). Lá o `Pendente` existe porque o fornecedor pode **sugerir** itens; sem esse
 *    fluxo aqui, um segundo eixo de estado não teria produtor — seria estado morto;
 *  • a chave natural de unicidade é o **nome** (como TipoDocumento), não o número: o número é gerado pelo
 *    sistema e portanto único por construção, então usá-lo como chave não impediria duplicata alguma.
 */
export class MaterialServico extends ItemCatalogo {
  private constructor(
    meta: MetadadosBase,
    private readonly _numero: string,
    private _nome: string,
    private _tipo: TipoItem,
    private _especificacoes: string | undefined,
    private _unidades: string[],
    situacao: SituacaoCatalogo,
  ) { super(meta, situacao); }

  static criar(input: {
    id: string; numero: string; nome: string; tipo?: TipoItem;
    especificacoes?: string; unidades?: readonly string[]; userName?: string;
  }): MaterialServico {
    return new MaterialServico(
      EntidadeBase.metaNova(input.id, input.userName),
      exigirTexto(input.numero, 'numero'),
      exigirTexto(input.nome, 'nome'),
      exigirTipo(input.tipo),
      textoOpcional(input.especificacoes),
      exigirUnidades(input.unidades),
      'ativo',
    );
  }

  static deEstado(s: MaterialServicoState): MaterialServico {
    return new MaterialServico(s.meta, s.numero, s.nome, s.tipo, s.especificacoes, [...s.unidades], s.situacao);
  }

  estado(): MaterialServicoState {
    return {
      meta: { id: this.id, registerDate: this.registerDate, updateDate: this.updateDate, lastUserUpdate: this.lastUserUpdate },
      numero: this._numero, nome: this._nome, tipo: this._tipo,
      especificacoes: this._especificacoes, unidades: [...this._unidades], situacao: this._situacao,
    };
  }

  get numero(): string { return this._numero; }
  get nome(): string { return this._nome; }
  get tipo(): TipoItem { return this._tipo; }
  get especificacoes(): string | undefined { return this._especificacoes; }
  get unidades(): readonly string[] { return this._unidades; }

  chave(): string { return normalizarChave(this._nome); }

  /**
   * Edição auditada (AD-18): devolve o diff antes/depois só do que mudou. O **número não é editável** —
   * é o identificador humano estável do item, referenciado por lotes/cotações; não figura na assinatura.
   */
  editar(
    campos: Partial<{ nome: string; tipo: TipoItem; especificacoes: string; unidades: readonly string[] }>,
    userName: string,
  ): CampoDiff[] {
    const diff: CampoDiff[] = [];
    if (campos.nome !== undefined) {
      const novo = exigirTexto(campos.nome, 'nome');
      if (novo !== this._nome) { diff.push({ campo: 'nome', antes: this._nome, depois: novo }); this._nome = novo; }
    }
    if (campos.tipo !== undefined) {
      const novo = exigirTipo(campos.tipo);
      if (novo !== this._tipo) { diff.push({ campo: 'tipo', antes: this._tipo, depois: novo }); this._tipo = novo; }
    }
    if (campos.especificacoes !== undefined) {
      const novo = textoOpcional(campos.especificacoes);
      if (novo !== this._especificacoes) { diff.push({ campo: 'especificacoes', antes: this._especificacoes, depois: novo }); this._especificacoes = novo; }
    }
    if (campos.unidades !== undefined) {
      const novo = exigirUnidades(campos.unidades);
      if (novo.join('|') !== this._unidades.join('|')) {
        diff.push({ campo: 'unidades', antes: [...this._unidades], depois: [...novo] });
        this._unidades = novo;
      }
    }
    if (diff.length) this.marcarAtualizacao(userName);
    return diff;
  }
}
