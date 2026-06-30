import CircuitBreaker from 'opossum';
import type { DadosCnpj, ReceitaGateway, ResultadoProveniente } from './receita-gateway.js';

/**
 * Mock da Receita para desbloquear o dev sem chave real (AD-4). O adaptador real
 * substitui apenas a função `fetchRaw`; o circuit breaker (Opossum) e o mapeamento de
 * proveniência permanecem. Contrato verificável por Pact (@pact-foundation/pact).
 */
export class ReceitaMockGateway implements ReceitaGateway {
  private readonly breaker: CircuitBreaker<[string], DadosCnpj>;

  constructor(private readonly seed: Map<string, DadosCnpj> = demoSeed()) {
    this.breaker = new CircuitBreaker((cnpj: string) => this.fetchRaw(cnpj), {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
    });
  }

  async consultarCnpj(cnpj: string): Promise<ResultadoProveniente<DadosCnpj>> {
    const timestamp = new Date().toISOString();
    try {
      const valor = await this.breaker.fire(cnpj);
      return { valor, fonte: 'Receita', timestamp, frescor: 'verificado' };
    } catch {
      // Circuit aberto / timeout → indisponível: o cliente cai no fallback manual visível (RF001/UX-DR2)
      return { valor: null, fonte: 'Receita', timestamp, frescor: 'indisponivel' };
    }
  }

  private async fetchRaw(cnpj: string): Promise<DadosCnpj> {
    const d = this.seed.get(cnpj);
    if (!d) throw new Error('CNPJ não encontrado no mock');
    return d;
  }
}

function demoSeed(): Map<string, DadosCnpj> {
  return new Map([
    ['12.345.678/0001-90', {
      razaoSocial: 'Confecções Vale do Acre Ltda',
      porte: 'ME',
      cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal' }],
      situacaoCadastral: 'ativa',
    }],
  ]);
}
