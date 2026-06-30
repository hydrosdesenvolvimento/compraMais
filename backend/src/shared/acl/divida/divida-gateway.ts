import type { Frescor, ResultadoProveniente } from '../receita/receita-gateway.js';

export type EstadoDivida = 'sem_debito' | 'debito_ativo' | 'penalidade' | 'inidoneidade';

export interface ResultadoDivida {
  readonly estado: EstadoDivida;
  readonly dataTermino?: string; // ISO — para penalidade/inidoneidade quando a fonte fornece (D3)
}

/** ACL de dívida (AD-4/5) — agnóstica de fonte (PGM/federais/estaduais). Resultado com proveniência. */
export interface DividaGateway {
  consultar(cnpj: string): Promise<ResultadoProveniente<ResultadoDivida>>;
}

export type { Frescor };
