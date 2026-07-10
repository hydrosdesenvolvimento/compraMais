/**
 * ACL do provedor de Prova de Vida / Liveness (AD-4/AD-5). O domínio nunca fala o dialeto do provedor
 * biométrico; o resultado vem SEMPRE tipado com proveniência (nunca um booleano nu). A imagem/vídeo
 * fica no provedor e não trafega para a persistência (minimização, RIPD).
 */
export type FrescorLiveness = 'verificado' | 'indisponivel';

/** Amostra enviada ao provedor. `desafio` é o token do desafio de liveness (opaco para o domínio). */
export interface AmostraLiveness {
  readonly fornecedorId: string;
  readonly desafio: string;
}

export interface ResultadoLiveness {
  readonly score: number; // 0..1
}

export interface ProvenienteLiveness {
  readonly valor: ResultadoLiveness | null;
  readonly provedor: string;
  readonly timestamp: string; // ISO-8601
  readonly frescor: FrescorLiveness;
}

export interface LivenessGateway {
  verificar(amostra: AmostraLiveness): Promise<ProvenienteLiveness>;
}
