import CircuitBreaker from 'opossum';
import { createNodeSeiClient, type NodeSeiClientConfig, type SeiClient } from './sei-client.js';
import { SeiError } from './sei-errors.js';
import type {
  CriarProcessoSeiInput, ProcessoCriadoSei, ProcessoSei, ResultadoSei, SeiGateway,
} from './sei-gateway.js';
import type { AdapterMetrics } from '../../observability/metrics.js';

const ADAPTADOR = 'sei';

/** Config do adapter real: credenciais + o id do tipo de processo do órgão (estável por órgão). */
export interface SeiWebConfig extends NodeSeiClientConfig {
  idTipoProcedimento: string;
}

/**
 * Adapter REAL do SEI (AD-4/5). Fala a camada web do SEI via `sei-client` (login SSO server-side +
 * parsing de HTML — modelo ../api_sei), com **circuit breaker** (opossum) e **fail-open**: se o SEI
 * cair ou o breaker abrir, devolve `frescor: 'indisponivel'` (o caso de uso decide bloquear/sinalizar),
 * nunca derruba o compraMais. Reautentica sob demanda quando a sessão expira.
 *
 * ⚠️ A ESCRITA (criarProcesso) pode ser frágil server-side no SEI real (autocomplete de tipo é AJAX
 * stateful — ver `sei-client`); documentado como risco/gate de QA.
 */
export class SeiWebGateway implements SeiGateway {
  private client: SeiClient | null = null;
  private readonly breakerPesquisa: CircuitBreaker<[string], ProcessoSei | null>;
  private readonly breakerCriar: CircuitBreaker<[CriarProcessoSeiInput], ProcessoCriadoSei | null>;

  constructor(private readonly config: SeiWebConfig, private readonly metrics?: AdapterMetrics) {
    this.breakerPesquisa = this.montarBreaker((numero: string) => this.fetchPesquisa(numero));
    this.breakerCriar = this.montarBreaker((input: CriarProcessoSeiInput) => this.fetchCriar(input));
  }

  async pesquisarProcesso(numero: string): Promise<ResultadoSei<ProcessoSei>> {
    const timestamp = new Date().toISOString();
    try { return { valor: await this.breakerPesquisa.fire(numero), fonte: 'SEI', timestamp, frescor: 'verificado' }; }
    catch { return { valor: null, fonte: 'SEI', timestamp, frescor: 'indisponivel' }; }
  }

  async criarProcesso(input: CriarProcessoSeiInput): Promise<ResultadoSei<ProcessoCriadoSei>> {
    const timestamp = new Date().toISOString();
    try { return { valor: await this.breakerCriar.fire(input), fonte: 'SEI', timestamp, frescor: 'verificado' }; }
    catch { return { valor: null, fonte: 'SEI', timestamp, frescor: 'indisponivel' }; }
  }

  /** Cliente autenticado, reusado entre chamadas; recria ao expirar a sessão. */
  private async ensureClient(): Promise<SeiClient> {
    if (!this.client) this.client = await createNodeSeiClient(this.config);
    return this.client;
  }

  private async comReautenticacao<T>(fn: (c: SeiClient) => Promise<T>): Promise<T> {
    try { return await fn(await this.ensureClient()); }
    catch (e) {
      if (e instanceof SeiError && e.code === 'session_expired') {
        this.client = null; // força novo login
        return fn(await this.ensureClient());
      }
      throw e;
    }
  }

  private async fetchPesquisa(numero: string): Promise<ProcessoSei | null> {
    return this.comReautenticacao(async (c) => {
      const p = await c.pesquisarProcesso(numero);
      return { idProtocolo: p.idProtocolo, numero: p.numero, url: p.url, documentos: p.documentos ?? [] };
    });
  }

  private async fetchCriar(input: CriarProcessoSeiInput): Promise<ProcessoCriadoSei | null> {
    return this.comReautenticacao(async (c) => {
      const p = await c.criarProcesso({
        idTipoProcedimento: this.config.idTipoProcedimento,
        especificacao: input.especificacao,
        nivelAcesso: input.nivelAcesso,
        observacoes: input.observacoes,
      });
      return { idProtocolo: p.idProtocolo, numero: p.numero, url: p.url };
    });
  }

  private montarBreaker<A extends unknown[], R>(fn: (...args: A) => Promise<R>): CircuitBreaker<A, R> {
    const breaker = new CircuitBreaker(fn, { timeout: 15000, errorThresholdPercentage: 50, resetTimeout: 30000 });
    if (this.metrics) {
      breaker.on('timeout', () => this.metrics!.registrarTimeout(ADAPTADOR));
      breaker.on('open', () => this.metrics!.registrarBreaker(ADAPTADOR, 'open'));
      breaker.on('halfOpen', () => this.metrics!.registrarBreaker(ADAPTADOR, 'halfOpen'));
      breaker.on('close', () => this.metrics!.registrarBreaker(ADAPTADOR, 'close'));
    }
    return breaker;
  }
}
