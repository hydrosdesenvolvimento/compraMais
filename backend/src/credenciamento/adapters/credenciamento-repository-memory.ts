import type { Credenciamento } from '../domain/credenciamento.js';
import type { CredenciamentoRepository } from '../application/solicitar-credenciamento.js';

export class CredenciamentoRepositoryMemory implements CredenciamentoRepository {
  private readonly map = new Map<string, Credenciamento>();

  async salvar(c: Credenciamento): Promise<void> { this.map.set(c.id, c); }
  async porId(id: string): Promise<Credenciamento | null> { return this.map.get(id) ?? null; }

  /** Prefere um credenciamento ATIVO (não cancelado); só devolve um cancelado se for o único do par. */
  async porFornecedorEEdital(fornecedorId: string, editalId: string): Promise<Credenciamento | null> {
    let cancelado: Credenciamento | null = null;
    for (const c of this.map.values()) {
      if (c.fornecedorId !== fornecedorId || c.editalId !== editalId) continue;
      if (c.situacao !== 'cancelado') return c;
      cancelado = c;
    }
    return cancelado;
  }

  /** Todos os credenciamentos do fornecedor, do mais recente ao mais antigo (registerDate desc). */
  async listarPorFornecedor(fornecedorId: string): Promise<Credenciamento[]> {
    return [...this.map.values()]
      .filter((c) => c.fornecedorId === fornecedorId)
      .sort((a, b) => b.registerDate.localeCompare(a.registerDate));
  }

  /** Todos os credenciamentos de um edital, do mais antigo ao mais recente (ordem de credenciamento). */
  async listarPorEdital(editalId: string): Promise<Credenciamento[]> {
    return [...this.map.values()]
      .filter((c) => c.editalId === editalId)
      .sort((a, b) => a.registerDate.localeCompare(b.registerDate));
  }
}
