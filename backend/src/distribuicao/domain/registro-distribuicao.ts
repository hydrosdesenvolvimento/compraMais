import { createHash } from 'node:crypto';
import type { ResultadoDistribuicao } from './motor.js';

/**
 * Registro canônico da matriz de distribuição (Story 5.2 / AD-10 / AD-24). É o **fato** produzido pelo
 * motor (função pura), congelado para a trilha: append-only, versionado por edital e com hash de
 * reprodutibilidade. Nunca se edita — reexecutar a distribuição gera uma NOVA versão (novo fato).
 */
export interface AlocacaoRegistro { fornecedorId: string; cota: number }

/** Matriz de UM item do edital (Fase 2): demanda do item + rateio entre os credenciados NAQUELE item. */
export interface ItemDistribuicao {
  itemId: string;
  demanda: number;
  distribuido: number;
  deficit: boolean;
  deficitQuantidade: number;
  alocacoes: AlocacaoRegistro[]; // ordem canônica do motor (AD-24), por item
}

export interface RegistroDistribuicao {
  id: string;
  editalId: string;
  versao: number; // 1, 2, … por edital (append-only)
  geradoEm: string; // ISO-8601
  regraDesempate: string; // parâmetro versionado (RNF008) — semente do desempate
  demandaTotal: number; // soma das demandas dos itens
  quantidadeDistribuida: number; // soma do distribuído dos itens
  deficit: boolean;
  deficitQuantidade: number;
  // Rateio AGREGADO por fornecedor (soma das cotas dos itens) — base de "cotasDoFornecedor" e leituras legadas.
  alocacoes: AlocacaoRegistro[];
  // Matriz POR ITEM (Fase 2). Vazio em registros agregados legados (sem detalhamento por item).
  itens: ItemDistribuicao[];
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

/** Monta o registro canônico AGREGADO a partir do resultado puro do motor (sem detalhamento por item). */
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
    itens: [], // registro agregado legado — sem matriz por item
    hash: hashDistribuicao(editalId, r),
  };
}

/**
 * Serialização canônica determinística da matriz POR ITEM — base do hash da Fase 2. Cobre, por item,
 * a demanda, o distribuído, o déficit e o rateio (ordem canônica do motor). Igual entrada → igual hash.
 */
export function serializarCanonicoItens(editalId: string, regraDesempate: string, itens: ItemDistribuicao[]): string {
  const blocos = itens.map((it) => {
    const linhas = it.alocacoes.map((a) => `${a.fornecedorId}:${a.cota}`).join(',');
    return `${it.itemId}#${it.demanda}#${it.distribuido}#${it.deficitQuantidade}#${linhas}`;
  }).join('|');
  return `${editalId}|${regraDesempate}|${blocos}`;
}
export function hashDistribuicaoItens(editalId: string, regraDesempate: string, itens: ItemDistribuicao[]): string {
  return createHash('sha256').update(serializarCanonicoItens(editalId, regraDesempate, itens)).digest('hex');
}

/**
 * Monta o registro canônico POR ITEM (Fase 2): recebe a matriz de cada item e deriva os totais do edital
 * (demanda/distribuído/déficit) e o rateio AGREGADO por fornecedor (soma das cotas dos itens). O hash
 * cobre o conteúdo por item.
 */
export function montarRegistroPorItem(input: {
  id: string; editalId: string; versao: number; geradoEm: string; regraDesempate: string; itens: ItemDistribuicao[];
}): RegistroDistribuicao {
  const { id, editalId, versao, geradoEm, regraDesempate, itens } = input;
  const demandaTotal = itens.reduce((s, it) => s + it.demanda, 0);
  const quantidadeDistribuida = itens.reduce((s, it) => s + it.distribuido, 0);
  const deficitQuantidade = demandaTotal - quantidadeDistribuida;
  // Rateio agregado por fornecedor: soma das cotas em todos os itens (ordem estável por fornecedorId).
  const porFornecedor = new Map<string, number>();
  for (const it of itens) for (const a of it.alocacoes) porFornecedor.set(a.fornecedorId, (porFornecedor.get(a.fornecedorId) ?? 0) + a.cota);
  const alocacoes = [...porFornecedor.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([fornecedorId, cota]) => ({ fornecedorId, cota }));
  return {
    id, editalId, versao, geradoEm, regraDesempate,
    demandaTotal, quantidadeDistribuida,
    deficit: deficitQuantidade > 0, deficitQuantidade,
    alocacoes,
    itens: itens.map((it) => ({ ...it, alocacoes: it.alocacoes.map((a) => ({ ...a })) })),
    hash: hashDistribuicaoItens(editalId, regraDesempate, itens),
  };
}
