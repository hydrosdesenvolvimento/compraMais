import type { Pool } from 'pg';
import type { NumeradorEditais } from '../application/numerador-editais.js';

/**
 * Adaptador PostgreSQL da porta NumeradorEditais (tabela `edital_numeros`, uma linha por ano).
 *
 * A reserva é **atômica em um único statement**: o `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`
 * trava a linha do ano e devolve o valor já incrementado, então dois backends criando editais ao
 * mesmo tempo nunca recebem o mesmo sequencial (o índice único em `numero` é a rede de segurança).
 */
export class NumeradorEditaisPg implements NumeradorEditais {
  constructor(private readonly pool: Pool) {}

  async proximo(ano: number): Promise<number> {
    const r = await this.pool.query(
      `INSERT INTO edital_numeros (ano, ultimo) VALUES ($1, 1)
       ON CONFLICT (ano) DO UPDATE SET ultimo = edital_numeros.ultimo + 1
       RETURNING ultimo`,
      [ano],
    );
    return Number((r.rows[0] as { ultimo: number }).ultimo);
  }
}
