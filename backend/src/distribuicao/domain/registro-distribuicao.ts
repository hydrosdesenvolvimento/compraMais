import { createHash } from 'node:crypto';
import type { ResultadoDistribuicao } from './motor.js';

/**
 * Registro canônico da matriz de distribuição (Story 5.2 / AD-10 / AD-24). É o **fato** produzido pelo
 * motor (função pura), congelado para a trilha: append-only, versionado por edital e com hash de
 * reprodutibilidade. Nunca se edita — reexecutar a distribuição gera uma NOVA versão (novo fato).
 */
export interface AlocacaoRegistro { fornecedorId: string; cota: number }

export interface RegistroDistribuicao {
  id: string;
  editalId: string;
  versao: number; // 1, 2, … por edital (append-only)
  geradoEm: string; // ISO-8601
  regraDesempate: string; // parâmetro versionado (RNF008) — semente do desempate
  demandaTotal: number;
  quantidadeDistribuida: number;
  deficit: boolean;
  deficitQuantidade: number;
  alocacoes: AlocacaoRegistro[]; // ordem canônica do motor (AD-24)
  hash: string; // SHA-256 da serialização canônica — prova de reprodutibilidade (AD-24/RNF008)
}

/**
 * Serialização canônica determinística da matriz — base do hash. Duas execuções com a mesma entrada
 * produzem a mesma string e, portanto, o mesmo hash (o motor é puro, RNF008). Não inclui `geradoEm`
 * nem `id`/`versao` (metadados de linha), apenas o conteúdo distribuído.
 */
export function serializarCanonico(editalId: string, r: ResultadoDistribuicao): string {
  const linhas = r.alocacoes.map((a) => `${a.id}:${a.cota}`).join(',');
  return `${editalId}|${r.regraDesempate}|${r.demandaTotal}|${r.quantidadeDistribuida}|${r.deficitQuantidade}|${linhas}`;
}

export function hashDistribuicao(editalId: string, r: ResultadoDistribuicao): string {
  return createHash('sha256').update(serializarCanonico(editalId, r)).digest('hex');
}

/** Monta o registro canônico a partir do resultado puro do motor, calculando o hash. */
export function montarRegistro(input: {
  id: string; editalId: string; versao: number; geradoEm: string; resultado: ResultadoDistribuicao;
}): RegistroDistribuicao {
  const { id, editalId, versao, geradoEm, resultado: r } = input;
  return {
    id, editalId, versao, geradoEm,
    regraDesempate: r.regraDesempate,
    demandaTotal: r.demandaTotal,
    quantidadeDistribuida: r.quantidadeDistribuida,
    deficit: r.deficit,
    deficitQuantidade: r.deficitQuantidade,
    alocacoes: r.alocacoes.map((a) => ({ fornecedorId: a.id, cota: a.cota })),
    hash: hashDistribuicao(editalId, r),
  };
}
