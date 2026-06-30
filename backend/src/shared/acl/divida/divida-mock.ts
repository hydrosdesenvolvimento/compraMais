import CircuitBreaker from 'opossum';
import type { DividaGateway, ResultadoDivida } from './divida-gateway.js';
import type { ResultadoProveniente } from '../receita/receita-gateway.js';
import type { AdapterMetrics } from '../../observability/metrics.js';

const ADAPTADOR = 'divida';

/**
 * Mock agregador das bases de dívida (PGM/federais/estaduais) com circuit breaker (AD-4).
 * O adaptador real substitui `fetchRaw`; o breaker e o mapeamento de proveniência permanecem.
 * Contrato verificável por Pact. Observabilidade (AD-22 / T027): timeouts e estado do breaker
 * são reportados ao sink de métricas quando injetado.
 */
export class DividaMockGateway implements DividaGateway {
  private readonly breaker: CircuitBreaker<[string], ResultadoDivida>;

  constructor(
    private readonly seed: Map<string, ResultadoDivida> = new Map(),
    private readonly metrics?: AdapterMetrics,
  ) {
    this.breaker = new CircuitBreaker((cnpj: string) => this.fetchRaw(cnpj), {
      timeout: 3000, errorThresholdPercentage: 50, resetTimeout: 10000,
    });
    if (this.metrics) {
      this.breaker.on('timeout', () => this.metrics!.registrarTimeout(ADAPTADOR));
      this.breaker.on('open', () => this.metrics!.registrarBreaker(ADAPTADOR, 'open'));
      this.breaker.on('halfOpen', () => this.metrics!.registrarBreaker(ADAPTADOR, 'halfOpen'));
      this.breaker.on('close', () => this.metrics!.registrarBreaker(ADAPTADOR, 'close'));
    }
  }

  async consultar(cnpj: string): Promise<ResultadoProveniente<ResultadoDivida>> {
    const timestamp = new Date().toISOString();
    try {
      const valor = await this.breaker.fire(cnpj);
      return { valor, fonte: 'Receita', timestamp, frescor: 'verificado' };
    } catch {
      return { valor: null, fonte: 'Receita', timestamp, frescor: 'indisponivel' };
    }
  }

  /** Sem seed → assume sem débito (CNPJ regular). Indisponibilidade é simulada por erro injetado. */
  private async fetchRaw(cnpj: string): Promise<ResultadoDivida> {
    return this.seed.get(cnpj) ?? { estado: 'sem_debito' };
  }
}
