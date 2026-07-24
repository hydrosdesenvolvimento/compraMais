// ACL do SEI (mesmo padrão de receita/dívida, AD-4/AD-5): o domínio nunca fala a camada web do SEI;
// resultado SEMPRE com proveniência. `frescor` = 'verificado' (veio do SEI) | 'indisponivel' (breaker
// aberto/erro — fail-open, o chamador decide). Modelo de implementação: ../api_sei.
import type { DocumentoRef } from './sei-parse.js';
import type { NivelAcesso } from './sei-client.js';

export type Frescor = 'verificado' | 'indisponivel';

export interface ResultadoSei<T> {
  readonly valor: T | null;
  readonly fonte: 'SEI';
  readonly timestamp: string; // ISO-8601
  readonly frescor: Frescor;
}

/** Processo do SEI (leitura). */
export interface ProcessoSei {
  readonly idProtocolo: string;
  readonly numero: string;
  readonly url?: string;
  readonly documentos: ReadonlyArray<DocumentoRef>;
}

/** Resultado da criação de um processo (push). */
export interface ProcessoCriadoSei {
  readonly idProtocolo: string;
  readonly numero: string;
  readonly url?: string;
}

export interface CriarProcessoSeiInput {
  readonly especificacao?: string;
  readonly nivelAcesso?: NivelAcesso;
  readonly observacoes?: string;
}

/**
 * Porta da integração SEI. Adapters: `SeiWebGateway` (real — login SSO + camada web via `sei-client`) e
 * `SeiMockGateway` (determinístico, testes/CI sem SEI). Ambos devolvem proveniência.
 */
export interface SeiGateway {
  /** Pull: pesquisa um processo por número e lista seus documentos (leitura). */
  pesquisarProcesso(numero: string): Promise<ResultadoSei<ProcessoSei>>;
  /** Push: cria um processo do tipo configurado (id do órgão). Operação de escrita. */
  criarProcesso(input: CriarProcessoSeiInput): Promise<ResultadoSei<ProcessoCriadoSei>>;
}

export type { DocumentoRef } from './sei-parse.js';
