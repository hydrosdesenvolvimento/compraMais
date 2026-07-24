/**
 * Porta de numeração sequencial dos itens do catálogo de materiais e serviços (UC020). Mesma forma da
 * `NumeradorEditais` (UC005): entrega o **próximo** sequencial do ano de forma atômica, para que dois
 * itens criados ao mesmo tempo nunca recebam o mesmo número. O formato final (`ITM-AAAA/NNN`) fica no
 * domínio (`material-servico.ts`); aqui só a sequência.
 *
 * Adaptadores: `NumeradorItensMemory` (testes/sem banco) e `NumeradorItensPg` (durável, atômico via
 * upsert na tabela `item_catalogo_numeros`).
 */
export interface NumeradorItens {
  /** Reserva e devolve o próximo sequencial (1-based) do ano. Nunca repete. */
  proximo(ano: number): Promise<number>;
}

/** Sequência em memória, por ano. Sem durabilidade — reinicia a cada boot (só testes/sem banco). */
export class NumeradorItensMemory implements NumeradorItens {
  private readonly porAno = new Map<number, number>();

  async proximo(ano: number): Promise<number> {
    const proximo = (this.porAno.get(ano) ?? 0) + 1;
    this.porAno.set(ano, proximo);
    return proximo;
  }
}
