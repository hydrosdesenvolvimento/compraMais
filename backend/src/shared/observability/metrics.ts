/**
 * Observabilidade base dos adaptadores (AD-22 / T039). Conta timeouts e estado do circuit breaker
 * por integração, para alertas sobre instabilidade das APIs de governo (Receita/PGM/SEI).
 * Exporter (Prometheus/OpenTelemetry) é detalhe de infra — aqui o contrato + um registro simples.
 */
export interface AdapterMetrics {
  registrarTimeout(adaptador: string): void;
  registrarBreaker(adaptador: string, estado: 'open' | 'halfOpen' | 'close'): void;
  snapshot(): Record<string, { timeouts: number; breaker: string }>;
}

export class InMemoryAdapterMetrics implements AdapterMetrics {
  private readonly m = new Map<string, { timeouts: number; breaker: string }>();
  private get(a: string) { return this.m.get(a) ?? { timeouts: 0, breaker: 'close' }; }
  registrarTimeout(a: string): void { const c = this.get(a); this.m.set(a, { ...c, timeouts: c.timeouts + 1 }); }
  registrarBreaker(a: string, estado: 'open' | 'halfOpen' | 'close'): void { this.m.set(a, { ...this.get(a), breaker: estado }); }
  snapshot(): Record<string, { timeouts: number; breaker: string }> { return Object.fromEntries(this.m); }
}
