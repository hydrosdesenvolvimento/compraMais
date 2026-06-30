/**
 * ACL da Receita Federal (AD-4/AD-5). O domínio nunca fala o dialeto externo.
 * Resultado SEMPRE tipado com proveniência — nunca um booleano nu.
 */
export type Frescor = 'verificado' | 'stale' | 'indisponivel';

export interface DadosCnpj {
  readonly razaoSocial: string;
  readonly porte: string;
  readonly cnaes: ReadonlyArray<{ codigoSubclasse: string; tipo: 'principal' | 'secundario' }>;
  readonly situacaoCadastral: 'ativa' | 'baixada' | 'inapta' | 'suspensa';
}

export interface ResultadoProveniente<T> {
  readonly valor: T | null;
  readonly fonte: 'Receita';
  readonly timestamp: string; // ISO-8601
  readonly frescor: Frescor;
}

export interface ReceitaGateway {
  consultarCnpj(cnpj: string): Promise<ResultadoProveniente<DadosCnpj>>;
}
