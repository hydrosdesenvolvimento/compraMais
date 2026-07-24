import { randomUUID } from 'node:crypto';
import type { DocumentoRepository, PaginacaoReq } from './gerir-documentos.js';
import type { StatusDoc } from '../domain/documento.js';
import { AnaliseCovalidacao } from '../domain/analise-covalidacao.js';
import { DocumentoAprovado, DocumentoReprovado, FornecedorCredenciado, FornecedorEmCorrecao } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

export interface AnaliseRepository { salvar(a: AnaliseCovalidacao): Promise<void>; }

export class DocumentoNaoEncontrado extends Error {
  constructor() { super('Document not found.'); this.name = 'DocumentoNaoEncontrado'; }
}

/** Item da fila com o tempo de espera visível (RN011 — sem SLA fixo, mas com tempo decorrido). */
export interface ItemFila { id: string; tipo: string; status: StatusDoc; enviadoEm: string }

/**
 * Item da fila GLOBAL de análise documental (tela "Análise Documental"): o veredito é por documento,
 * mas a fila cruza todos os fornecedores. Além do documento, carrega a empresa e o CNPJ já resolvidos
 * para exibição (o front não precisa de um segundo request por linha).
 */
export interface ItemFilaAnalise { id: string; tipo: string; status: StatusDoc; enviadoEm: string; fornecedorId: string; empresa: string; cnpj: string | null }

/**
 * Caso de uso Covalidar (UC006 / RF004). A decisão é sempre humana (a CPL aciona este fluxo) — não há
 * aprovação automática de declaratórios; reprovação exige justificativa (RN003). Além do veredito por
 * documento, o **conjunto** aprovado promove o fornecedor a `credenciado` (UC006 passo 3) e qualquer
 * reprovação o devolve a `em_correcao` (A1, laço com UC016). O fornecedor é opcional: quando ausente
 * (ex.: testes de nível documental), só o documento transita.
 */
export class Covalidar {
  constructor(
    private readonly docs: DocumentoRepository,
    private readonly analises: AnaliseRepository,
    private readonly bus: EventBus,
    private readonly fornecedores?: FornecedorRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async listarPendentes(fornecedorId: string): Promise<Array<{ id: string; tipo: string; enviadoEm: string }>> {
    return (await this.docs.listarPendentes(fornecedorId)).map((d) => ({ id: d.id, tipo: d.tipo, enviadoEm: d.registerDate }));
  }

  /**
   * Fila de covalidação com busca por instância parcial (QBE — FR-015). O probe filtra por
   * status/tipo (AND, ausentes ignorados); sem status explícito assume o default da fila ('pendente').
   * Paginação fica fora do probe. Cada item carrega `enviadoEm` para exibir o tempo decorrido (RN011).
   */
  async buscarFila(
    fornecedorId: string,
    probe: { status?: StatusDoc; tipo?: string } = {},
    page?: PaginacaoReq,
  ): Promise<ItemFila[]> {
    const docs = await this.docs.buscarPorExemplo(
      { fornecedorId, status: probe.status ?? 'pendente', tipo: probe.tipo },
      page,
    );
    return docs.map((d) => ({ id: d.id, tipo: d.tipo, status: d.status, enviadoEm: d.registerDate }));
  }

  /**
   * Fila GLOBAL de análise documental (RF004 / tela "Análise Documental"): todos os documentos
   * pendentes de covalidação, de TODOS os fornecedores, com a empresa e o CNPJ resolvidos para
   * exibição. Junta o read model de documentos (probe só por `status: 'pendente'`, sem fornecedor) ao
   * catálogo de fornecedores na aplicação — escala do MVP (a matéria-prima cabe em memória). Um documento
   * sem fornecedor casado cai no fallback (o próprio id), nunca desaparece da fila. `size` amplo evita
   * truncar a fila operacional (a paginação da tela é client-side).
   */
  async filaAnalise(): Promise<ItemFilaAnalise[]> {
    const docs = await this.docs.buscarPorExemplo({ status: 'pendente' }, { page: 1, size: 500 });
    const fornecedores = (await this.fornecedores?.listar()) ?? [];
    const porId = new Map(fornecedores.map((f) => [f.id, f]));
    return docs.map((d) => {
      const f = porId.get(d.fornecedorId);
      return {
        id: d.id, tipo: d.tipo, status: d.status, enviadoEm: d.registerDate,
        fornecedorId: d.fornecedorId, empresa: f?.razaoSocial ?? d.fornecedorId, cnpj: f?.cnpj.valor ?? null,
      };
    });
  }

  async aprovar(documentoId: string, analistaId: string, empresaId: string): Promise<void> {
    const doc = await this.exigir(documentoId);
    doc.aprovar(analistaId);
    await this.docs.salvar(doc);
    await this.analises.salvar(AnaliseCovalidacao.aprovar({ id: randomUUID(), documentoId, analistaId }));
    await this.bus.publish(new DocumentoAprovado(doc.fornecedorId, { documentoId }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));
    await this.avaliarVeredito(doc.fornecedorId, analistaId, empresaId);
  }

  async reprovar(documentoId: string, analistaId: string, empresaId: string, justificativa: string): Promise<void> {
    const doc = await this.exigir(documentoId);
    // valida justificativa no domínio (AnaliseCovalidacao.reprovar e Documento.reprovar)
    const analise = AnaliseCovalidacao.reprovar({ id: randomUUID(), documentoId, analistaId, justificativa });
    doc.reprovar(justificativa, analistaId);
    await this.docs.salvar(doc);
    await this.analises.salvar(analise);
    await this.bus.publish(new DocumentoReprovado(doc.fornecedorId, { documentoId, motivo: justificativa }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));

    // A1 (UC006): a reprovação devolve o fornecedor ao laço de correção e serve de gancho de notificação.
    const fornecedor = await this.fornecedores?.porId(doc.fornecedorId);
    if (fornecedor && fornecedor.status === 'pendente_analise') {
      fornecedor.devolverParaCorrecao(analistaId);
      await this.fornecedores!.salvar(fornecedor);
      await this.bus.publish(new FornecedorEmCorrecao(doc.fornecedorId, { fornecedorId: doc.fornecedorId, documentoId, motivo: justificativa }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));
    }
  }

  /**
   * UC006 passo 3 — veredito do **conjunto**: quando o fornecedor está `pendente_analise` e todos os
   * seus documentos estão aprovados (nenhum pendente/reprovado), promove-o a `credenciado`.
   */
  private async avaliarVeredito(fornecedorId: string, analistaId: string, empresaId: string): Promise<void> {
    const fornecedor = await this.fornecedores?.porId(fornecedorId);
    if (!fornecedor || fornecedor.status !== 'pendente_analise') return;
    const todos = await this.docs.listar(fornecedorId);
    if (todos.length === 0 || !todos.every((d) => d.status === 'aprovado')) return;
    fornecedor.credenciar(analistaId);
    await this.fornecedores!.salvar(fornecedor);
    await this.bus.publish(new FornecedorCredenciado(fornecedorId, { fornecedorId }, { userId: analistaId, empresaId }).toEnvelope(randomUUID(), this.now()));
  }

  private async exigir(documentoId: string) {
    const doc = await this.docs.porId(documentoId);
    if (!doc) throw new DocumentoNaoEncontrado();
    return doc;
  }
}
