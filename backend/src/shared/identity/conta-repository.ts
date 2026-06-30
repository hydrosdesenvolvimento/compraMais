import type { ContaAcesso } from './conta-acesso.js';

/** Porta de persistência de contas (titular/procurador). */
export interface ContaRepository {
  salvar(c: ContaAcesso): Promise<void>;
  porId(id: string): Promise<ContaAcesso | null>;
  titularDe(fornecedorId: string): Promise<ContaAcesso | null>;
  listarPorFornecedor(fornecedorId: string): Promise<ContaAcesso[]>;
}

export class ContaRepositoryMemory implements ContaRepository {
  private readonly map = new Map<string, ContaAcesso>();
  async salvar(c: ContaAcesso): Promise<void> { this.map.set(c.id, c); }
  async porId(id: string): Promise<ContaAcesso | null> { return this.map.get(id) ?? null; }
  async titularDe(fornecedorId: string): Promise<ContaAcesso | null> {
    for (const c of this.map.values()) if (c.fornecedorId === fornecedorId && c.papel === 'titular') return c;
    return null;
  }
  async listarPorFornecedor(fornecedorId: string): Promise<ContaAcesso[]> {
    return [...this.map.values()].filter((c) => c.fornecedorId === fornecedorId);
  }
}
