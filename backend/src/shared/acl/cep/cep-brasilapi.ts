import CircuitBreaker from 'opossum';
import type { CepGateway, Endereco, ResultadoCep } from './cep-gateway.js';
import { obterJson, type Fetcher } from '../http.js';

/** Resposta crua da BrasilAPI (GET /api/cep/v2/{cep}). */
interface CepBrasilApi {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  location?: { coordinates?: { latitude?: string | number; longitude?: string | number } };
}

/**
 * Adaptador de CEP via BrasilAPI (https://brasilapi.com.br/docs) — pública, sem chave. Circuit breaker
 * (Opossum) + proveniência (AD-4/AD-5). Usa v2 (com coordenadas). Falha/timeout/404 → 'indisponivel'.
 */
export class CepBrasilApiGateway implements CepGateway {
  private readonly breaker: CircuitBreaker<[string], Endereco>;

  constructor(
    private readonly baseUrl = 'https://brasilapi.com.br/api',
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 4000,
  ) {
    this.breaker = new CircuitBreaker((cep: string) => this.buscar(cep), {
      timeout: timeoutMs + 1500,
      errorThresholdPercentage: 50,
      resetTimeout: 15000,
    });
  }

  async consultarCep(cep: string): Promise<ResultadoCep> {
    const timestamp = new Date().toISOString();
    try {
      const valor = await this.breaker.fire(cep);
      return { valor, fonte: 'BrasilAPI', timestamp, frescor: 'verificado' };
    } catch {
      return { valor: null, fonte: 'BrasilAPI', timestamp, frescor: 'indisponivel' };
    }
  }

  private async buscar(cep: string): Promise<Endereco> {
    const digitos = cep.replace(/\D/g, '');
    const raw = (await obterJson(this.fetcher, `${this.baseUrl}/cep/v2/${digitos}`, this.timeoutMs)) as CepBrasilApi;
    return mapearCep(raw);
  }
}

export function mapearCep(r: CepBrasilApi): Endereco {
  const coord = r.location?.coordinates;
  const lat = num(coord?.latitude);
  const lon = num(coord?.longitude);
  return {
    cep: (r.cep ?? '').replace(/\D/g, ''),
    estado: r.state ?? '',
    cidade: r.city ?? '',
    bairro: r.neighborhood ?? '',
    rua: r.street ?? '',
    ...(lat !== undefined ? { latitude: lat } : {}),
    ...(lon !== undefined ? { longitude: lon } : {}),
  };
}

function num(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}
