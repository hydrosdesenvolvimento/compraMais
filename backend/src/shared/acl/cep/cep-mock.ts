import type { CepGateway, Endereco, ResultadoCep } from './cep-gateway.js';

/** Mock de CEP (dev sem rede / testes). Mesma porta do adaptador BrasilAPI. */
export class CepMockGateway implements CepGateway {
  constructor(private readonly seed: Map<string, Endereco> = demoSeed()) {}

  async consultarCep(cep: string): Promise<ResultadoCep> {
    const timestamp = new Date().toISOString();
    const valor = this.seed.get(cep.replace(/\D/g, '')) ?? null;
    return { valor, fonte: 'BrasilAPI', timestamp, frescor: valor ? 'verificado' : 'indisponivel' };
  }
}

function demoSeed(): Map<string, Endereco> {
  return new Map([
    ['69900062', { cep: '69900062', estado: 'AC', cidade: 'Rio Branco', bairro: 'Centro', rua: 'Rua Benjamin Constant', latitude: -9.9754, longitude: -67.8249 }],
  ]);
}
