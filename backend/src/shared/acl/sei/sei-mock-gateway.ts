import { randomUUID } from 'node:crypto';
import type {
  CriarProcessoSeiInput, ProcessoCriadoSei, ProcessoSei, ResultadoSei, SeiGateway,
} from './sei-gateway.js';

/**
 * Adapter em memória do SEI (determinístico) — usado em teste/CI (sem SEI real) e em dev quando
 * `SEI_PROVIDER=mock`. Não fala rede: gera números de processo no formato do SEI e devolve processos
 * pesquisados de um seed. Mesmo contrato/proveniência do adapter real.
 */
export class SeiMockGateway implements SeiGateway {
  private seq = 0;
  constructor(private readonly seed: Map<string, ProcessoSei> = new Map()) {}

  /** Semeia um processo pesquisável por número (para o pull em dev/teste). */
  semear(p: ProcessoSei): void { this.seed.set(p.numero, p); }

  async pesquisarProcesso(numero: string): Promise<ResultadoSei<ProcessoSei>> {
    const timestamp = new Date().toISOString();
    const achado = this.seed.get(numero);
    if (achado) return { valor: achado, fonte: 'SEI', timestamp, frescor: 'verificado' };
    // Sem seed: devolve um processo sintético consistente com o número pedido (útil no fluxo de dev).
    return {
      valor: { idProtocolo: `mock-${numero}`, numero, url: undefined, documentos: [] },
      fonte: 'SEI', timestamp, frescor: 'verificado',
    };
  }

  async criarProcesso(input: CriarProcessoSeiInput): Promise<ResultadoSei<ProcessoCriadoSei>> {
    const timestamp = new Date().toISOString();
    const ano = new Date(timestamp).getUTCFullYear();
    const numero = this.gerarNumero(ano);
    const criado: ProcessoCriadoSei = { idProtocolo: randomUUID(), numero };
    // Torna o processo criado pesquisável em seguida (coerência do fluxo em dev/teste).
    this.seed.set(numero, { idProtocolo: criado.idProtocolo, numero, documentos: [] });
    void input;
    return { valor: criado, fonte: 'SEI', timestamp, frescor: 'verificado' };
  }

  /** Número no formato SEI (`AAAA.NNNNNN.NNNNN/AAAA-DD`), sintético para o mock. */
  private gerarNumero(ano: number): string {
    this.seq += 1;
    const meio = String(this.seq).padStart(6, '0');
    const seq2 = String(this.seq).padStart(5, '0');
    return `${ano}.${meio}.${seq2}/${ano}-00`;
  }
}
