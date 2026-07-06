import type { ContestacaoCnae } from '../domain/contestacao-cnae.js';
import type { ContestacaoRepository } from '../application/contestar-cnae.js';

export class ContestacaoRepositoryMemory implements ContestacaoRepository {
  private readonly map = new Map<string, ContestacaoCnae>();
  async salvar(c: ContestacaoCnae): Promise<void> { this.map.set(c.id, c); }
  async porId(id: string): Promise<ContestacaoCnae | null> { return this.map.get(id) ?? null; }
  async doEdital(editalId: string): Promise<ContestacaoCnae[]> {
    return [...this.map.values()].filter((c) => c.editalId === editalId);
  }
  async pendentesDe(editalId: string): Promise<number> {
    return [...this.map.values()].filter((c) => c.editalId === editalId && c.situacao === 'pendente').length;
  }
  /** Contestações pendentes abertas por um fornecedor (consolidação — Épico 7-1). */
  async pendentesDoFornecedor(fornecedorId: string): Promise<ContestacaoCnae[]> {
    return [...this.map.values()].filter((c) => c.fornecedorId === fornecedorId && c.situacao === 'pendente');
  }
}
