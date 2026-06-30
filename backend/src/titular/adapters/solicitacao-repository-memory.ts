import type { SolicitacaoTitular } from '../domain/solicitacao-titular.js';
import type { SolicitacaoRepository, SolicitacaoProbe, PaginacaoReq } from '../application/gerir-direitos.js';

export class SolicitacaoRepositoryMemory implements SolicitacaoRepository {
  private readonly map = new Map<string, SolicitacaoTitular>();
  async salvar(s: SolicitacaoTitular): Promise<void> { this.map.set(s.id, s); }
  async porId(id: string): Promise<SolicitacaoTitular | null> { return this.map.get(id) ?? null; }

  /** QBE (FR-007): AND, ausentes ignorados. */
  async buscarPorExemplo(probe: SolicitacaoProbe, page?: PaginacaoReq): Promise<SolicitacaoTitular[]> {
    const todos = [...this.map.values()].filter((s) =>
      (probe.titularId === undefined || s.titularId === probe.titularId) &&
      (probe.tipo === undefined || s.tipo === probe.tipo) &&
      (probe.status === undefined || s.status === probe.status));
    const size = page?.size ?? 20; const p = page?.page ?? 1;
    return todos.slice((p - 1) * size, (p - 1) * size + size);
  }
}
