/**
 * Motor de Distribuição — UC008 / RF005 (§8 do PRD).
 *
 * Story 5.1 (Épico 5): rateio **igualitário limitado à capacidade declarada** (water-filling
 * iterativo) com tratamento determinístico do resto (maiores restos / Hamilton) e desempate
 * determinístico. Função **PURA**: sem relógio, sem random, sem leitura de DB (AD-7/AD-8, RNF008).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESCOPO.
 * Item × Lote foi **ratificado como item** (ARBITRAGEM-01, 2026-07-16) — ver `spec/docs/epics.md`
 * §Épico 5 e `spec/docs/prd.md §8`. Este arquivo é o **kernel determinístico** (Story 5.1),
 * agnóstico à granularidade: opera sobre uma única `demanda` escalar + o conjunto de aptos/teto, e é
 * invocado uma vez por unidade de demanda. O wiring (Story 5.2 — persistência canônica append-only +
 * hash na trilha) está em `distribuicao/application/executar-distribuicao.ts` e
 * `distribuicao/domain/registro-distribuicao.ts`. Ficam **pendentes**:
 *   • Story 5.3 — cadastro de reserva (UC009);
 *   • Story 5.4 — substituição de desistente.
 * O critério de resto (Hamilton) e o desempate são parâmetros a ratificar (LAC-04c/d); por isso
 * a `regraDesempate` é versionada e ecoada no resultado, gravada na trilha via o registro (RNF008).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Fornecedor apto ao rateio, com o teto declarado (RN005) e as chaves de desempate. */
export interface AptoDistribuicao {
  /** Identificador estável do participante (credenciamento/fornecedor). */
  id: string;
  /** Capacidade produtiva declarada — teto do rateio (RN005). Inteiro positivo. */
  teto: number;
  /** Ordem de credenciamento — desempate primário (§8, passo 5). */
  ordemCredenciamento: number;
  /** CNPJ (14 dígitos) — desempate secundário: menor CNPJ (§8, passo 5). */
  cnpj: string;
}

/** Regra de desempate — parâmetro versionado e logado (AD-8, RNF008). */
export type RegraDesempate = 'ordem_credenciamento_cnpj';
export const REGRA_DESEMPATE_PADRAO: RegraDesempate = 'ordem_credenciamento_cnpj';

export interface EntradaMotor {
  /** Quantidade total a ratear. Inteiro positivo. */
  demanda: number;
  aptos: AptoDistribuicao[];
  /** Default: `ordem_credenciamento_cnpj` (§8). */
  regraDesempate?: RegraDesempate;
}

export interface Alocacao {
  id: string;
  cota: number;
}

export interface ResultadoDistribuicao {
  /** Regra de desempate efetivamente aplicada (para a trilha — RNF008). */
  regraDesempate: RegraDesempate;
  /** Matriz de alocação em **ordem canônica** (ordem de credenciamento, depois CNPJ — AD-24). */
  alocacoes: Alocacao[];
  /** Demanda solicitada. */
  demandaTotal: number;
  /** Soma efetivamente alocada (≤ demanda; < demanda em déficit). */
  quantidadeDistribuida: number;
  /** `true` quando a capacidade total é menor que a demanda (§8, passo 6). */
  deficit: boolean;
  /** Quanto da demanda ficou sem cobertura (0 quando não há déficit). */
  deficitQuantidade: number;
}

function inteiroPositivo(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

/** Ordenação canônica determinística: ordem de credenciamento, depois menor CNPJ, depois id. */
function compararCanonico(a: AptoDistribuicao, b: AptoDistribuicao): number {
  if (a.ordemCredenciamento !== b.ordemCredenciamento) return a.ordemCredenciamento - b.ordemCredenciamento;
  if (a.cnpj !== b.cnpj) return a.cnpj < b.cnpj ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Calcula o rateio determinístico da `demanda` entre os `aptos`, respeitando o teto de cada um.
 * Puro e reprodutível: a mesma entrada produz sempre a mesma saída (RNF008).
 */
export function distribuir(entrada: EntradaMotor): ResultadoDistribuicao {
  const { demanda, aptos } = entrada;
  const regraDesempate = entrada.regraDesempate ?? REGRA_DESEMPATE_PADRAO;

  if (!inteiroPositivo(demanda)) throw new DemandaInvalida(demanda);
  if (aptos.length === 0) throw new SemAptos();

  const vistos = new Set<string>();
  for (const a of aptos) {
    if (!inteiroPositivo(a.teto)) throw new CapacidadeInvalida(a.id, a.teto);
    if (vistos.has(a.id)) throw new AptosDuplicados(a.id);
    vistos.add(a.id);
  }

  // Trabalha sobre uma cópia em ordem canônica: elimina qualquer dependência da ordem de entrada.
  const ordenados = [...aptos].sort(compararCanonico);

  const capacidadeTotal = ordenados.reduce((s, a) => s + a.teto, 0);
  const deficit = capacidadeTotal < demanda;

  // 1. water-filling ITERATIVO → cota ideal (fracionária) de cada apto.
  //    divide o saldo igualmente entre os não-travados; quem excede o teto trava no teto e
  //    devolve o excedente ao pool; repete até ninguém exceder (corrige a "passada única").
  const cotaIdeal = new Map<string, number>();
  let naoTravados = [...ordenados];
  let saldo = demanda;
  while (naoTravados.length > 0) {
    const quota = saldo / naoTravados.length;
    const travam = naoTravados.filter((a) => a.teto < quota);
    if (travam.length === 0) {
      for (const a of naoTravados) cotaIdeal.set(a.id, quota);
      break;
    }
    for (const a of travam) {
      cotaIdeal.set(a.id, a.teto);
      saldo -= a.teto;
    }
    const travamIds = new Set(travam.map((a) => a.id));
    naoTravados = naoTravados.filter((a) => !travamIds.has(a.id));
  }
  // Déficit: todos travaram e o saldo não coube; os que restaram sem cota ideal ficam no teto.
  for (const a of ordenados) if (!cotaIdeal.has(a.id)) cotaIdeal.set(a.id, a.teto);

  // 2. piso de cada cota ideal.
  const cota = new Map<string, number>();
  for (const a of ordenados) cota.set(a.id, Math.floor(cotaIdeal.get(a.id)!));

  // 3. resto = demanda − soma(pisos).
  const somaPisos = ordenados.reduce((s, a) => s + cota.get(a.id)!, 0);
  let resto = demanda - somaPisos;

  // 4. Hamilton: os `resto` itens vão a quem tem MAIOR parte fracionária E folga de teto,
  //    um a um. 5. Desempate: ordem de credenciamento; persistindo, menor CNPJ (compararCanonico).
  //    Cada apto recebe no máximo +1 (fração < 1) — ranqueia por fração desc, aplica em cascata,
  //    pulando quem já não tem folga (piso == teto) — o que naturalmente barra o caso de déficit.
  const candidatos = [...ordenados].sort((a, b) => {
    const fa = cotaIdeal.get(a.id)! - cota.get(a.id)!;
    const fb = cotaIdeal.get(b.id)! - cota.get(b.id)!;
    if (fa !== fb) return fb - fa; // maior fração primeiro
    return compararCanonico(a, b); // desempate determinístico
  });
  for (const a of candidatos) {
    if (resto === 0) break;
    if (cota.get(a.id)! < a.teto) {
      cota.set(a.id, cota.get(a.id)! + 1);
      resto -= 1;
    }
  }

  const alocacoes: Alocacao[] = ordenados.map((a) => ({ id: a.id, cota: cota.get(a.id)! }));
  const quantidadeDistribuida = alocacoes.reduce((s, a) => s + a.cota, 0);

  return {
    regraDesempate,
    alocacoes,
    demandaTotal: demanda,
    quantidadeDistribuida,
    deficit,
    deficitQuantidade: deficit ? demanda - capacidadeTotal : 0,
  };
}

export class DemandaInvalida extends Error {
  constructor(valor: number) {
    super(`Demand must be a positive integer, got ${valor}.`);
    this.name = 'DemandaInvalida';
  }
}
export class SemAptos extends Error {
  constructor() {
    super('Distribution requires at least one eligible supplier.');
    this.name = 'SemAptos';
  }
}
export class CapacidadeInvalida extends Error {
  constructor(id: string, valor: number) {
    super(`Declared capacity (teto) for '${id}' must be a positive integer, got ${valor}.`);
    this.name = 'CapacidadeInvalida';
  }
}
export class AptosDuplicados extends Error {
  constructor(id: string) {
    super(`Duplicate supplier id in the eligible set: '${id}'.`);
    this.name = 'AptosDuplicados';
  }
}
