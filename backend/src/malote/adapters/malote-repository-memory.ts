import type { Malote } from '../domain/malote.js';
import type { MaloteRepository, MaloteProbe, PaginacaoReq } from '../application/gerar-malote.js';

export class MaloteRepositoryMemory implements MaloteRepository {
  private readonly map = new Map<string, Malote>();
  async salvar(m: Malote): Promise<void> { this.map.set(m.id, m); }
  async porId(id: string): Promise<Malote | null> { return this.map.get(id) ?? null; }

  /** QBE (FR-007): AND, ausentes ignorados. */
  async buscarPorExemplo(probe: MaloteProbe, page?: PaginacaoReq): Promise<Malote[]> {
    const todos = [...this.map.values()].filter((m) =>
      (probe.fornecedorId === undefined || m.fornecedorId === probe.fornecedorId) &&
      (probe.editalId === undefined || m.editalId === probe.editalId) &&
      (probe.status === undefined || m.status === probe.status));
    const size = page?.size ?? 20; const p = page?.page ?? 1;
    return todos.slice((p - 1) * size, (p - 1) * size + size);
  }
}
