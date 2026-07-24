import type { Notificacao } from '../domain/notificacao.js';
import type { NotificacaoRepository, FiltroNotificacoes } from '../application/notificacao-repository.js';

/** Adaptador em memória da porta NotificacaoRepository (testes/sem banco). Mesmo contrato do pg. */
export class NotificacaoRepositoryMemory implements NotificacaoRepository {
  private readonly map = new Map<string, Notificacao>();

  async salvar(n: Notificacao): Promise<void> { this.map.set(n.id, n); }
  async porId(id: string): Promise<Notificacao | null> { return this.map.get(id) ?? null; }

  async existePorChave(chave: string): Promise<boolean> {
    for (const n of this.map.values()) if (n.chave() === chave) return true;
    return false;
  }

  async listarDoFornecedor(fornecedorId: string, filtro?: FiltroNotificacoes): Promise<Notificacao[]> {
    const todas = [...this.map.values()]
      .filter((n) => n.fornecedorId === fornecedorId)
      .sort((a, b) => b.estado().criadoEm.localeCompare(a.estado().criadoEm)); // mais recentes primeiro
    const page = Math.max(1, filtro?.page ?? 1);
    const size = Math.max(1, filtro?.size ?? 20);
    return todas.slice((page - 1) * size, (page - 1) * size + size);
  }

  async contarDoFornecedor(fornecedorId: string): Promise<number> {
    return [...this.map.values()].filter((n) => n.fornecedorId === fornecedorId).length;
  }

  async contarNaoLidas(fornecedorId: string): Promise<number> {
    return [...this.map.values()].filter((n) => n.fornecedorId === fornecedorId && !n.lida).length;
  }

  async marcarLida(id: string, agoraIso: string): Promise<void> {
    this.map.get(id)?.marcarLida(agoraIso);
  }

  async marcarTodasLidas(fornecedorId: string, agoraIso: string): Promise<number> {
    let n = 0;
    for (const notif of this.map.values()) {
      if (notif.fornecedorId === fornecedorId && !notif.lida) { notif.marcarLida(agoraIso); n++; }
    }
    return n;
  }
}
