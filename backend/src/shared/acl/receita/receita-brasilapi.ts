import CircuitBreaker from 'opossum';
import type { DadosCnpj, ReceitaGateway, ResultadoProveniente } from './receita-gateway.js';
import { obterJson, type Fetcher } from '../http.js';

/** Resposta crua da BrasilAPI (GET /api/cnpj/v1/{cnpj}) — só os campos que mapeamos. */
interface CnpjBrasilApi {
  razao_social?: string;
  porte?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnaes_secundarios?: Array<{ codigo?: number }>;
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string; cnpj_cpf_do_socio?: string }>;
}

/**
 * Adaptador real da Receita via BrasilAPI (https://brasilapi.com.br/docs) — pública, sem chave.
 * Implementa a MESMA porta do mock (AD-4): circuit breaker (Opossum) + mapeamento de proveniência.
 * Falha/timeout/404 → frescor 'indisponivel' (o cliente cai no fallback manual visível — RF001/UX-DR2).
 */
export class ReceitaBrasilApiGateway implements ReceitaGateway {
  private readonly breaker: CircuitBreaker<[string], DadosCnpj>;

  constructor(
    private readonly baseUrl = 'https://brasilapi.com.br/api',
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 8000, // CNPJ agrega várias fontes; mais lento que o CEP
  ) {
    this.breaker = new CircuitBreaker((cnpj: string) => this.buscar(cnpj), {
      timeout: timeoutMs + 1500,
      errorThresholdPercentage: 50,
      resetTimeout: 15000,
    });
  }

  async consultarCnpj(cnpj: string): Promise<ResultadoProveniente<DadosCnpj>> {
    const timestamp = new Date().toISOString();
    try {
      const valor = await this.breaker.fire(cnpj);
      return { valor, fonte: 'Receita', timestamp, frescor: 'verificado' };
    } catch {
      return { valor: null, fonte: 'Receita', timestamp, frescor: 'indisponivel' };
    }
  }

  private async buscar(cnpj: string): Promise<DadosCnpj> {
    const digitos = cnpj.replace(/\D/g, '');
    const raw = (await obterJson(this.fetcher, `${this.baseUrl}/cnpj/v1/${digitos}`, this.timeoutMs)) as CnpjBrasilApi;
    return mapearCnpj(raw);
  }
}

export function mapearCnpj(r: CnpjBrasilApi): DadosCnpj {
  const principal = { codigoSubclasse: subclasse(r.cnae_fiscal), tipo: 'principal' as const };
  const secundarios = (r.cnaes_secundarios ?? [])
    .filter((c) => c.codigo)
    .map((c) => ({ codigoSubclasse: subclasse(c.codigo), tipo: 'secundario' as const }));
  const socios = (r.qsa ?? [])
    .filter((s) => s.nome_socio)
    .map((s) => ({ nome: s.nome_socio ?? '', qualificacao: s.qualificacao_socio ?? '', documento: s.cnpj_cpf_do_socio ?? '' }));
  return {
    razaoSocial: r.razao_social ?? '',
    porte: mapearPorte(r.porte),
    cnaes: [principal, ...secundarios],
    situacaoCadastral: mapearSituacao(r.descricao_situacao_cadastral),
    ...(socios.length ? { socios } : {}),
  };
}

function subclasse(codigo: number | undefined): string {
  return String(codigo ?? 0).replace(/\D/g, '').padStart(7, '0').slice(0, 7);
}

function mapearPorte(porte: string | undefined): string {
  const p = (porte ?? '').toUpperCase();
  if (p.includes('MICRO')) return 'ME';
  if (p.includes('PEQUENO')) return 'EPP';
  return porte && porte.trim() ? porte : 'DEMAIS';
}

function mapearSituacao(desc: string | undefined): DadosCnpj['situacaoCadastral'] {
  const d = (desc ?? '').toUpperCase();
  if (d.includes('ATIVA')) return 'ativa';
  if (d.includes('BAIXADA')) return 'baixada';
  if (d.includes('SUSPENSA')) return 'suspensa';
  return 'inapta';
}
