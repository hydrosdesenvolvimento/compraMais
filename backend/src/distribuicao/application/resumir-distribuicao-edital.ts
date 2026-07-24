import { distribuir } from '../domain/motor.js';
import { montarAptosDoEdital } from './montar-aptos.js';
import { EditalNaoEncontrado, type DistribuicaoRepository } from './executar-distribuicao.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { SecretariaLookup } from '../../credenciamento/application/listar-credenciamentos.js';

/**
 * Leitura mínima do edital para o cabeçalho + a demanda. A `demanda` deixou de ser um campo do edital e
 * passa a ser a **soma das quantidades dos itens** (o server compõe o lookup com o repo de itens).
 */
export interface EditalResumoDistribuicaoLookup {
  porId(id: string): Promise<{
    id: string; numero: string; objeto: string; secretariaId: string;
    situacao: string; demanda: number;
  } | null>;
}

/** Uma linha do rateio, enriquecida com nome e capacidade — que a matriz canônica não guarda. */
export interface RateioLinha {
  fornecedorId: string;
  nome: string; // razão social
  capacidade: number; // teto declarado no credenciamento (RN005)
  cota: number;
}

export interface ResumoDistribuicaoView {
  edital: { id: string; numero: string; objeto: string; secretariaSigla: string | null; situacao: string };
  /** true = matriz congelada (append-only, já homologada); false = preview determinístico do Motor. */
  homologada: boolean;
  versao: number | null; // versão da matriz vigente; null enquanto é apenas preview
  total: number; // demanda total do edital
  distribuido: number; // quantidade efetivamente distribuída (≤ total)
  habilitados: number; // nº de fornecedores no rateio
  deficit: boolean; // capacidade combinada < demanda (RN005)
  deficitQuantidade: number; // saldo não coberto (0 quando não há déficit)
  rateio: RateioLinha[];
}

/** Projeção interna comum às duas origens (matriz vigente × preview do Motor), antes do enriquecimento. */
interface BaseRateio {
  alocacoes: Array<{ id: string; cota: number }>;
  total: number;
  distribuido: number;
  deficit: boolean;
  deficitQuantidade: number;
  versao: number | null;
  homologada: boolean;
}

/**
 * Projeção de leitura da tela "Distribuição Inteligente" (Painel Admin · Operação, UC008 / RF005 /
 * RN005). Dado um edital, entrega o cabeçalho, os totais e o rateio por fornecedor (nome + capacidade
 * declarada + cota). Se já existe matriz congelada (append-only), ela tem precedência e a tela mostra
 * o resultado homologado; caso contrário, roda o Motor puro como **preview** (sem persistir) para o
 * gestor conferir antes de homologar. O preview usa exatamente os mesmos aptos da execução
 * (`montarAptosDoEdital`) — determinístico, portanto idêntico ao que será congelado. Somente leitura.
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

    // Teto declarado por fornecedor (a matriz canônica só guarda a cota); vale para as duas origens.
    const aceitos = (await this.creds.listarPorEdital(editalId)).filter((c) => c.situacao === 'aceito');
    const tetoPorId = new Map<string, number>(aceitos.map((c) => [c.fornecedorId, c.capacidadeTeto]));

    const matriz = await this.repo.ultimaDoEdital(editalId);
    const base = matriz
      ? {
          alocacoes: matriz.alocacoes.map((a) => ({ id: a.fornecedorId, cota: a.cota })),
          total: matriz.demandaTotal,
          distribuido: matriz.quantidadeDistribuida,
          deficit: matriz.deficit,
          deficitQuantidade: matriz.deficitQuantidade,
          versao: matriz.versao,
          homologada: true,
        }
      : await this.preview(editalId, e.demanda);

    const rateio: RateioLinha[] = await Promise.all(
      base.alocacoes.map(async (a) => {
        const f = await this.fornecedores.porId(a.id);
        return { fornecedorId: a.id, nome: f?.razaoSocial ?? a.id, capacidade: tetoPorId.get(a.id) ?? 0, cota: a.cota };
      }),
    );

    return {
      edital: {
        id: e.id, numero: e.numero, objeto: e.objeto,
        secretariaSigla: await this.sigla(e.secretariaId), situacao: e.situacao,
      },
      homologada: base.homologada,
      versao: base.versao,
      total: base.total,
      distribuido: base.distribuido,
      habilitados: rateio.length,
      deficit: base.deficit,
      deficitQuantidade: base.deficitQuantidade,
      rateio,
    };
  }

  /** Preview determinístico (não persiste). Sem aptos ou sem demanda → rateio vazio (déficit total). */
  private async preview(editalId: string, demanda: number): Promise<BaseRateio> {
    const aptos = await montarAptosDoEdital(this.creds, this.fornecedores, editalId);
    if (aptos.length === 0 || demanda <= 0) {
      return { alocacoes: [], total: Math.max(demanda, 0), distribuido: 0, deficit: demanda > 0, deficitQuantidade: Math.max(demanda, 0), versao: null, homologada: false };
    }
    const r = distribuir({ demanda, aptos });
    return {
      alocacoes: r.alocacoes.map((a) => ({ id: a.id, cota: a.cota })),
      total: r.demandaTotal,
      distribuido: r.quantidadeDistribuida,
      deficit: r.deficit,
      deficitQuantidade: r.deficitQuantidade,
      versao: null,
      homologada: false,
    };
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match cai para o próprio id — nunca quebra a tela. */
  private async sigla(secretariaId: string): Promise<string | null> {
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
