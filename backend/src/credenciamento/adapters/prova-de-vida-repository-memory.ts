import type { ProvaDeVida } from '../domain/prova-de-vida.js';
import type { ProvaDeVidaRepository } from '../application/validar-prova-de-vida.js';

/** Adaptador em memória da porta ProvaDeVidaRepository (testes e execução sem banco). */
export class ProvaDeVidaRepositoryMemory implements ProvaDeVidaRepository {
  private readonly lista: ProvaDeVida[] = [];

  async salvar(p: ProvaDeVida): Promise<void> { this.lista.push(p); }

  /** A mais recente do credenciamento (append-only: a última registrada é a válida). */
  async ultimaDoCredenciamento(credenciamentoId: string): Promise<ProvaDeVida | null> {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const p = this.lista[i];
      if (p && p.credenciamentoId === credenciamentoId) return p;
    }
    return null;
  }
}
