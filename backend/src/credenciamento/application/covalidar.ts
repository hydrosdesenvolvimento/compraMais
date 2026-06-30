import { randomUUID } from 'node:crypto';
import type { DocumentoRepository, PaginacaoReq } from './gerir-documentos.js';
import type { StatusDoc } from '../domain/documento.js';
import { AnaliseCovalidacao } from '../domain/analise-covalidacao.js';
import { DocumentoAprovado, DocumentoReprovado } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';

export interface AnaliseRepository { salvar(a: AnaliseCovalidacao): Promise<void>; }

export class DocumentoNaoEncontrado extends Error {
  constructor() { super('Documento não encontrado.'); this.name = 'DocumentoNaoEncontrado'; }
}

/**
 * Caso de uso Covalidar (FR-001/002/003/004/009). A decisão é sempre humana (a CPL aciona este
 * fluxo) — não há aprovação automática de declaratórios. Reprovação exige justificativa.
 */
export class Covalidar {
  constructor(
    private readonly docs: DocumentoRepository,
    private readonly analises: AnaliseRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async listarPendentes(fornecedorId: string): Promise<Array<{ id: string; tipo: string }>> {
    return (await this.docs.listarPendentes(fornecedorId)).map((d) => ({ id: d.id, tipo: d.tipo }));
  }

  /**
   * Fila de covalidação com busca por instância parcial (QBE — FR-015). O probe filtra por
   * status/tipo (AND, ausentes ignorados); sem status explícito assume o default da fila ('pendente').
   * Paginação fica fora do probe.
   */
  async buscarFila(
    fornecedorId: string,
    probe: { status?: StatusDoc; tipo?: string } = {},
    page?: PaginacaoReq,
  ): Promise<Array<{ id: string; tipo: string; status: StatusDoc }>> {
    const docs = await this.docs.buscarPorExemplo(
      { fornecedorId, status: probe.status ?? 'pendente', tipo: probe.tipo },
      page,
    );
    return docs.map((d) => ({ id: d.id, tipo: d.tipo, status: d.status }));
  }

  async aprovar(documentoId: string, analistaId: string, empresaId: string): Promise<void> {
    const doc = await this.exigir(documentoId);
    doc.aprovar(analistaId);
    await this.docs.salvar(doc);
    await this.analises.salvar(AnaliseCovalidacao.aprovar({ id: randomUUID(), documentoId, analistaId }));
    await this.bus.publish(new DocumentoAprovado(doc.fornecedorId, { documentoId }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));
  }

  async reprovar(documentoId: string, analistaId: string, empresaId: string, justificativa: string): Promise<void> {
    const doc = await this.exigir(documentoId);
    // valida justificativa no domínio (AnaliseCovalidacao.reprovar e Documento.reprovar)
    const analise = AnaliseCovalidacao.reprovar({ id: randomUUID(), documentoId, analistaId, justificativa });
    doc.reprovar(justificativa, analistaId);
    await this.docs.salvar(doc);
    await this.analises.salvar(analise);
    await this.bus.publish(new DocumentoReprovado(doc.fornecedorId, { documentoId, motivo: justificativa }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));
  }

  private async exigir(documentoId: string) {
    const doc = await this.docs.porId(documentoId);
    if (!doc) throw new DocumentoNaoEncontrado();
    return doc;
  }
}
