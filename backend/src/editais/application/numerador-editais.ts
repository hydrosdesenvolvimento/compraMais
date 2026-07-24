/**
 * Porta de numeração sequencial de editais (UC005). Entrega o **próximo** sequencial do ano de forma
 * atômica — dois editais criados ao mesmo tempo nunca recebem o mesmo número. O formato final
 * (`ED-AAAA/NNN`) fica no domínio (`numero-edital.ts`); aqui só a sequência.
 *
 * Adaptadores: `NumeradorEditaisMemory` (testes/sem banco) e `NumeradorEditaisPg` (durável, atômico
 * via upsert na tabela `edital_numeros`).
 */
export interface NumeradorEditais {
  /** Reserva e devolve o próximo sequencial (1-based) do ano. Nunca repete. */
  proximo(ano: number): Promise<number>;
}
