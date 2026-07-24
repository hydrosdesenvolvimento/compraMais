import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from '../application/listar-editais-compativeis.js';

export class EditalRepositoryMemory implements EditalRepository {
  private readonly map = new Map<string, Edital>();
  /** Seeder de teste: garante quantitativo/prazo e publica. */
  semear(e: Edital): void { e.publicar(); this.map.set(e.id, e); }
  async salvar(e: Edital): Promise<void> { this.map.set(e.id, e); }
  async abertos(): Promise<Edital[]> { return [...this.map.values()].filter((e) => e.situacao === 'publicado'); }
  async porId(id: string): Promise<Edital | null> { return this.map.get(id) ?? null; }

  /** QBE (FR-011): cada campo definido filtra por igualdade (AND); CNAE casa contra a lista alvo. */
  async buscarPorExemplo(probe: EditalProbe, page?: PaginacaoReq): Promise<Edital[]> {
    const todos = this.filtrar(probe);
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    return todos.slice((p - 1) * size, (p - 1) * size + size);
  }

  /** Total do mesmo probe (sem paginação) para o pager da gestão. */
  async contarPorExemplo(probe: EditalProbe): Promise<number> {
    return this.filtrar(probe).length;
  }

  /** Filtro QBE compartilhado entre busca e contagem; `texto` casa parcial (case-insensitive) em número/objeto. */
  private filtrar(probe: EditalProbe): Edital[] {
    const t = probe.texto?.toLowerCase();
    return [...this.map.values()].filter((e) =>
      (probe.secretariaId === undefined || e.secretariaId === probe.secretariaId) &&
      (probe.situacao === undefined || e.situacao === probe.situacao) &&
      (probe.cnae === undefined || e.cnaesAlvo.includes(probe.cnae)) &&
      (!t || e.numero.toLowerCase().includes(t) || e.objeto.toLowerCase().includes(t)));
  }
}
