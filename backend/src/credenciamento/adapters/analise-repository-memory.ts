import type { AnaliseCovalidacao } from '../domain/analise-covalidacao.js';
import type { AnaliseRepository } from '../application/covalidar.js';

/** Histórico de análises em memória (MVP/teste). Append: mantém o histórico por documento. */
export class AnaliseRepositoryMemory implements AnaliseRepository {
  private readonly lista: AnaliseCovalidacao[] = [];
  async salvar(a: AnaliseCovalidacao): Promise<void> { this.lista.push(a); }
  porDocumento(documentoId: string): AnaliseCovalidacao[] { return this.lista.filter((a) => a.documentoId === documentoId); }
}
