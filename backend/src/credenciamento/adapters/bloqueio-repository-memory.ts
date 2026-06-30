import type { Bloqueio } from '../domain/bloqueio.js';
import type { BloqueioRepository } from '../application/verificar-elegibilidade.js';

export class BloqueioRepositoryMemory implements BloqueioRepository {
  private readonly map = new Map<string, Bloqueio>();
  async salvar(b: Bloqueio): Promise<void> { this.map.set(b.id, b); }
  async porId(id: string): Promise<Bloqueio | null> { return this.map.get(id) ?? null; }
  async ativosDe(fornecedorId: string): Promise<Bloqueio[]> {
    return [...this.map.values()].filter((b) => b.fornecedorId === fornecedorId && b.situacao === 'ativo');
  }
  /** Contagem global de bloqueios ativos (funil do dashboard — Épico 9). */
  async contarAtivos(): Promise<number> {
    return [...this.map.values()].filter((b) => b.situacao === 'ativo').length;
  }
}
