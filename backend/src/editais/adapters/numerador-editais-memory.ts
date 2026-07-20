import type { NumeradorEditais } from '../application/numerador-editais.js';

/**
 * Adaptador em memória da porta NumeradorEditais (testes / execução sem banco). O incremento é
 * síncrono dentro do método: o event loop não intercala entre a leitura e a escrita, então o
 * sequencial nunca repete mesmo com chamadas concorrentes.
 */
export class NumeradorEditaisMemory implements NumeradorEditais {
  private readonly porAno = new Map<number, number>();

  async proximo(ano: number): Promise<number> {
    const seq = (this.porAno.get(ano) ?? 0) + 1;
    this.porAno.set(ano, seq);
    return seq;
  }

  /** Alinha a sequência a um estado pré-existente (semente de teste). */
  semear(ano: number, ultimo: number): void {
    this.porAno.set(ano, ultimo);
  }
}
