import CircuitBreaker from 'opossum';
import type { AmostraLiveness, LivenessGateway, ProvenienteLiveness, ResultadoLiveness } from './liveness-gateway.js';
import type { AdapterMetrics } from '../../observability/metrics.js';

const ADAPTADOR = 'liveness';
const PROVEDOR = 'liveness-mock';

/**
 * Mock do provedor de liveness com circuit breaker (AD-4). O adaptador real substitui `fetchRaw` (chamada
 * ao SDK biométrico); o breaker e o mapeamento de proveniência permanecem. Determinístico por `desafio`
 * (Pact-friendly): default aprova (score alto); `reprovar` devolve score baixo; `indisponivel` simula
 * falha do provedor → circuit breaker abre → proveniência `indisponivel` (fail-open + flag na aplicação,
 * AD-12). A imagem/vídeo NÃO é retida — só o score trafega (minimização, RIPD).
 */
export class LivenessMockGateway implements LivenessGateway {
  private readonly breaker: CircuitBreaker<[AmostraLiveness], ResultadoLiveness>;

  constructor(
    private readonly seed: Map<string, ResultadoLiveness> = new Map(),
    private readonly metrics?: AdapterMetrics,
  ) {
    this.breaker = new CircuitBreaker((amostra: AmostraLiveness) => this.fetchRaw(amostra), {
      timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000,
    });
    if (this.metrics) {
      this.breaker.on('timeout', () => this.metrics!.registrarTimeout(ADAPTADOR));
      this.breaker.on('open', () => this.metrics!.registrarBreaker(ADAPTADOR, 'open'));
      this.breaker.on('halfOpen', () => this.metrics!.registrarBreaker(ADAPTADOR, 'halfOpen'));
      this.breaker.on('close', () => this.metrics!.registrarBreaker(ADAPTADOR, 'close'));
    }
  }

  async verificar(amostra: AmostraLiveness): Promise<ProvenienteLiveness> {
    const timestamp = new Date().toISOString();
    try {
      const valor = await this.breaker.fire(amostra);
      return { valor, provedor: PROVEDOR, timestamp, frescor: 'verificado' };
    } catch {
      return { valor: null, provedor: PROVEDOR, timestamp, frescor: 'indisponivel' };
    }
  }

  /** Seed por `desafio` tem prioridade; senão o token dirige o resultado determinístico do mock. */
  private async fetchRaw(amostra: AmostraLiveness): Promise<ResultadoLiveness> {
    const semeado = this.seed.get(amostra.desafio);
    if (semeado) return semeado;
    if (amostra.desafio === 'indisponivel') throw new Error('liveness provider unavailable (mock)');
    if (amostra.desafio === 'reprovar') return { score: 0.2 };
    return { score: 0.97 };
  }
}
