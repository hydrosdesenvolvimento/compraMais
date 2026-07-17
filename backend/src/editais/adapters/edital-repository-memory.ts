import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from '../application/listar-editais-compativeis.js';

export class EditalRepositoryMemory implements EditalRepository {
  private readonly map = new Map<string, Edital>();
  /** Seeder de teste: publica o edital (rascunho → aberto, AD-37) e o guarda. */
  semear(e: Edital): void { e.publicar(); this.map.set(e.id, e); }
  async salvar(e: Edital): Promise<void> { this.map.set(e.id, e); }
  async abertos(): Promise<Edital[]> { return [...this.map.values()].filter((e) => e.situacao === 'aberto'); }
  async porId(id: string): Promise<Edital | null> { return this.map.get(id) ?? null; }

  /** QBE (FR-011): cada campo definido filtra por igualdade (AND); CNAE casa contra a lista alvo. */
  async buscarPorExemplo(probe: EditalProbe, page?: PaginacaoReq): Promise<Edital[]> {
    const todos = [...this.map.values()].filter((e) =>
      (probe.secretariaId === undefined || e.secretariaId === probe.secretariaId) &&
      (probe.situacao === undefined || e.situacao === probe.situacao) &&
      (probe.cnae === undefined || e.cnaesAlvo.includes(probe.cnae)));
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    return todos.slice((p - 1) * size, (p - 1) * size + size);
  }
}
