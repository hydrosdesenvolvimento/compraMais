import { distribuir } from '../domain/motor.js';
import { montarAptosDoItem } from './montar-aptos.js';
import { EditalNaoEncontrado, type DistribuicaoRepository } from './executar-distribuicao.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { SecretariaLookup } from '../../credenciamento/application/listar-credenciamentos.js';

/** Um item do edital para o resumo (id + metadados + quantidade demandada). */
export interface EditalItemResumo { itemId: string; numero: number; nome: string; unidade: string; quantidade: number }

/**
 * Leitura mínima do edital para o cabeçalho + os ITENS (Fase 2 — o rateio roda por item). O server
 * compõe o lookup com o repo de itens do edital.
 */
export interface EditalResumoDistribuicaoLookup {
  porId(id: string): Promise<{
    id: string; numero: string; objeto: string; secretariaId: string;
    situacao: string; itens: EditalItemResumo[];
  } | null>;
}

/** Uma linha do rateio, enriquecida com nome e capacidade — que a matriz canônica não guarda. */
export interface RateioLinha {
  fornecedorId: string;
  nome: string; // razão social
  capacidade: number; // teto declarado (RN005) — no item, ou agregado
  cota: number;
}

/** Rateio de UM item do edital (Fase 2). */
export interface ItemResumoView {
  itemId: string;
  numero: number;
  nome: string;
  unidade: string;
  demanda: number;
  distribuido: number;
  deficit: boolean;
  deficitQuantidade: number;
  rateio: RateioLinha[];
}

export interface ResumoDistribuicaoView {
  edital: { id: string; numero: string; objeto: string; secretariaSigla: string | null; situacao: string };
  /** true = matriz congelada (append-only, já homologada); false = preview determinístico do Motor. */
  homologada: boolean;
  versao: number | null; // versão da matriz vigente; null enquanto é apenas preview
  total: number; // demanda total do edital (soma dos itens)
  distribuido: number; // quantidade efetivamente distribuída (≤ total)
  habilitados: number; // nº de fornecedores distintos com cota em algum item
  deficit: boolean;
  deficitQuantidade: number;
  itens: ItemResumoView[]; // rateio POR item (Fase 2)
  rateio: RateioLinha[]; // rateio AGREGADO por fornecedor (soma das cotas dos itens) — resumo/compat
}

/** Base interna por item (alocações brutas), antes do enriquecimento com nome/capacidade. */
interface ItemBase { item: EditalItemResumo; alocacoes: Array<{ id: string; cota: number }>; demanda: number; distribuido: number; deficit: boolean; deficitQuantidade: number }

/**
 * Projeção de leitura da tela "Distribuição Inteligente" (Painel Admin · Operação, UC008 / RF005 /
 * RN005), agora POR ITEM (Fase 2). Se existe matriz congelada (append-only), ela tem precedência (mostra
 * o resultado homologado); senão roda o Motor puro como **preview** por item (sem persistir), com os
 * mesmos aptos da execução (`montarAptosDoItem`) — determinístico, idêntico ao que será congelado.
 */
export class ResumoDistribuicaoEdital {
  constructor(
    private readonly editais: EditalResumoDistribuicaoLookup,
    private readonly creds: CredenciamentoRepository,
    private readonly fornecedores: FornecedorRepository,
    private readonly repo: DistribuicaoRepository,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async resumir(editalId: string): Promise<ResumoDistribuicaoView> {
    const e = await this.editais.porId(editalId);
    if (!e) throw new EditalNaoEncontrado();

    const aceitos = (await this.creds.listarPorEdital(editalId)).filter((c) => c.situacao === 'aceito');
    // Teto declarado por (item, fornecedor) — a matriz só guarda a cota; vale para as duas origens.
    const tetoItemForn = new Map<string, number>();
    for (const c of aceitos) for (const ci of c.itens) tetoItemForn.set(`${ci.itemId}::${c.fornecedorId}`, ci.capacidadeTeto);

    const matriz = await this.repo.ultimaDoEdital(editalId);

    const bases: ItemBase[] = [];
    for (const item of e.itens) {
      if (matriz) {
        const mi = matriz.itens.find((x) => x.itemId === item.itemId);
        bases.push(mi
          ? { item, alocacoes: mi.alocacoes.map((a) => ({ id: a.fornecedorId, cota: a.cota })), demanda: mi.demanda, distribuido: mi.distribuido, deficit: mi.deficit, deficitQuantidade: mi.deficitQuantidade }
          : { item, alocacoes: [], demanda: item.quantidade, distribuido: 0, deficit: item.quantidade > 0, deficitQuantidade: item.quantidade });
      } else {
        // Preview determinístico (não persiste). Item sem aptos → déficit total.
        const aptos = await montarAptosDoItem(this.creds, this.fornecedores, editalId, item.itemId);
        if (aptos.length === 0 || item.quantidade <= 0) {
          bases.push({ item, alocacoes: [], demanda: item.quantidade, distribuido: 0, deficit: item.quantidade > 0, deficitQuantidade: item.quantidade });
        } else {
          const r = distribuir({ demanda: item.quantidade, aptos });
          bases.push({ item, alocacoes: r.alocacoes.map((a) => ({ id: a.id, cota: a.cota })), demanda: r.demandaTotal, distribuido: r.quantidadeDistribuida, deficit: r.deficit, deficitQuantidade: r.deficitQuantidade });
        }
      }
    }

    const nome = async (id: string) => (await this.fornecedores.porId(id))?.razaoSocial ?? id;

    const itens: ItemResumoView[] = [];
    for (const b of bases) {
      const rateio: RateioLinha[] = await Promise.all(b.alocacoes.map(async (a) => ({
        fornecedorId: a.id, nome: await nome(a.id), capacidade: tetoItemForn.get(`${b.item.itemId}::${a.id}`) ?? 0, cota: a.cota,
      })));
      itens.push({ itemId: b.item.itemId, numero: b.item.numero, nome: b.item.nome, unidade: b.item.unidade, demanda: b.demanda, distribuido: b.distribuido, deficit: b.deficit, deficitQuantidade: b.deficitQuantidade, rateio });
    }

    // Totais do edital + rateio agregado por fornecedor (soma das cotas dos itens).
    const total = bases.reduce((s, b) => s + b.demanda, 0);
    const distribuido = bases.reduce((s, b) => s + b.distribuido, 0);
    const agg = new Map<string, number>();
    for (const b of bases) for (const a of b.alocacoes) agg.set(a.id, (agg.get(a.id) ?? 0) + a.cota);
    const tetoAgregado = new Map<string, number>(aceitos.map((c) => [c.fornecedorId, c.capacidadeTeto]));
    const rateio: RateioLinha[] = await Promise.all(
      [...agg.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(async ([id, cota]) => ({
        fornecedorId: id, nome: await nome(id), capacidade: tetoAgregado.get(id) ?? 0, cota,
      })),
    );

    return {
      edital: { id: e.id, numero: e.numero, objeto: e.objeto, secretariaSigla: await this.sigla(e.secretariaId), situacao: e.situacao },
      homologada: !!matriz,
      versao: matriz?.versao ?? null,
      total,
      distribuido,
      habilitados: agg.size,
      deficit: total - distribuido > 0,
      deficitQuantidade: total - distribuido,
      itens,
      rateio,
    };
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match cai para o próprio id — nunca quebra a tela. */
  private async sigla(secretariaId: string): Promise<string | null> {
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
