import type { Consentimento } from '../domain/consentimento.js';
import type { ConsentimentoRepository } from '../application/consentimento-repository.js';

/**
 * Adaptador em memória da porta ConsentimentoRepository. Mesmo contrato do adaptador pg — inclusive a
 * idempotência append-only: regravar um id existente NÃO sobrescreve o fato já registrado.
 */
export class ConsentimentoRepositoryMemory implements ConsentimentoRepository {
  private readonly map = new Map<string, Consentimento>();

  async salvar(c: Consentimento): Promise<void> {
    if (this.map.has(c.id)) return; // ON CONFLICT DO NOTHING: consentimento não se edita
    this.map.set(c.id, c);
  }

  async porId(id: string): Promise<Consentimento | null> { return this.map.get(id) ?? null; }

  async porFornecedor(fornecedorId: string): Promise<Consentimento[]> {
    return [...this.map.values()]
      .filter((c) => c.fornecedorId === fornecedorId)
      .sort((a, b) => a.concedidoEm.localeCompare(b.concedidoEm));
  }

  /** Eliminação LGPD (art. 18, V). Única exceção ao append-only: o titular pediu para sair. */
  async removerDoFornecedor(fornecedorId: string): Promise<number> {
    const alvos = [...this.map.values()].filter((c) => c.fornecedorId === fornecedorId);
    for (const c of alvos) this.map.delete(c.id);
    return alvos.length;
  }
}
