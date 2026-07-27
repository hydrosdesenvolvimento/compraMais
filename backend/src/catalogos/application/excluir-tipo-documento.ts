import { randomUUID } from 'node:crypto';
import type { CatalogoRepository } from './catalogo-repository.js';
import type { TipoDocumento } from '../domain/tipo-documento.js';
import { TIPOS_DOCUMENTO_DE_SISTEMA } from '../domain/tipos-documento-baseline.js';
import { CatalogoItemExcluido } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Porta mínima consumida daqui — implementada pelo DocumentoRepository. A referência é pelo NOME porque
 * `documentos.tipo` guarda o texto do tipo (migração 0018), não um id: não existe FK para amarrar.
 */
export interface UsoEmDocumentos {
  /** true se existe ao menos um documento enviado com este tipo (comparação case-insensitive). */
  usadoPorAlgumDocumento(nome: string): Promise<boolean>;
}

export class TipoDocumentoNaoEncontrado extends Error {
  constructor() { super('File type not found.'); this.name = 'TipoDocumentoNaoEncontrado'; }
}
export class TipoDocumentoAtivoNaoExcluivel extends Error {
  constructor() { super('Only inactive file types can be deleted; inactivate it first.'); this.name = 'TipoDocumentoAtivoNaoExcluivel'; }
}
export class TipoDocumentoEmUso extends Error {
  constructor() { super('File type has documents already submitted and cannot be deleted.'); this.name = 'TipoDocumentoEmUso'; }
}
export class TipoDocumentoDeSistema extends Error {
  constructor() { super('System file type required by the platform and cannot be deleted.'); this.name = 'TipoDocumentoDeSistema'; }
}

/**
 * Exclusão FÍSICA de um tipo de arquivo (RF022 / UC020), restrita ao Administrador no controller —
 * gate mais estreito que as demais escritas do catálogo, que também aceitam a Secretaria (`smga`).
 * Segue o mesmo desenho de `ExcluirMaterialServico` (a inativação lógica da RN015 continua sendo o
 * caminho padrão) e acrescenta uma guarda própria dos tipos de documento. Em ordem:
 *
 *   1. o tipo NÃO é de sistema (`TIPOS_DOCUMENTO_DE_SISTEMA`) — checado primeiro de propósito: é a
 *      única condição terminal, e avisar antes evita que o Administrador inative a "Foto do Responsável"
 *      para tentar excluí-la e, de quebra, derrube a prova de vida (UC007);
 *   2. o tipo já está INATIVO (a exclusão não atalha a inativação);
 *   3. NENHUM documento foi enviado com esse tipo — do contrário o histórico do fornecedor apontaria
 *      para um tipo que não existe mais e o reenvio passaria a falhar com `TipoDocumentoDesconhecido`.
 *
 * Registra a exclusão na trilha append-only (AD-18) via `CatalogoItemExcluido`.
 */
export class ExcluirTipoDocumento {
  constructor(
    private readonly repo: CatalogoRepository<TipoDocumento>,
    private readonly usoDocumentos: UsoEmDocumentos,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async excluir(id: string, actor: Actor): Promise<void> {
    const tipo = await this.repo.porId(id);
    if (!tipo) throw new TipoDocumentoNaoEncontrado();
    if (ehTipoDeSistema(tipo.nome)) throw new TipoDocumentoDeSistema();
    if (tipo.ativo) throw new TipoDocumentoAtivoNaoExcluivel();
    if (await this.usoDocumentos.usadoPorAlgumDocumento(tipo.nome)) throw new TipoDocumentoEmUso();
    await this.repo.remover(id);
    await this.bus.publish(new CatalogoItemExcluido(id, { catalogo: 'tipo-documento', itemId: id }, actor).toEnvelope(randomUUID(), this.now()));
  }
}

/** Compara pela chave natural do catálogo (nome, case-insensitive) — igual ao índice `lower(nome)`. */
function ehTipoDeSistema(nome: string): boolean {
  const alvo = nome.trim().toLowerCase();
  return TIPOS_DOCUMENTO_DE_SISTEMA.some((n) => n.toLowerCase() === alvo);
}
