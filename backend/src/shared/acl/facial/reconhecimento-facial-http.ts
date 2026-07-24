import type {
  MotivoFalhaExtracao,
  ReconhecimentoFacialGateway,
  ResultadoExtracao,
} from './reconhecimento-facial-gateway.js';

/**
 * Falha de TRANSPORTE/serviço (não é "sem rosto") — o serviço Python está fora do ar, deu timeout ou
 * respondeu algo malformado. Distinta dos motivos de negócio ({@link MotivoFalhaExtracao}): o caso de
 * uso a traduz para "tente novamente", nunca para "reprovado".
 */
export class ReconhecimentoFacialIndisponivel extends Error {
  constructor(causa: string) {
    super(`Serviço de reconhecimento facial indisponível: ${causa}`);
    this.name = 'ReconhecimentoFacialIndisponivel';
  }
}

const MOTIVOS: ReadonlySet<string> = new Set<MotivoFalhaExtracao>([
  'rosto_nao_detectado',
  'multiplos_rostos',
  'qualidade_baixa',
]);

export interface OpcoesHttpFacial {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  /** Injetável para teste offline (default: fetch global do Node). */
  readonly fetchImpl?: typeof fetch;
}

/**
 * Adaptador de produção: fala com o serviço Python (InsightFace/ArcFace) por HTTP interno.
 * Implementa a MESMA porta do mock — o domínio não percebe a diferença.
 */
export class ReconhecimentoFacialHttpGateway implements ReconhecimentoFacialGateway {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpcoesHttpFacial) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 5000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async extrairTemplate(imagem: Buffer): Promise<ResultadoExtracao> {
    let resposta: Response;
    try {
      resposta = await this.fetchImpl(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imagem: imagem.toString('base64') }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (causa) {
      throw new ReconhecimentoFacialIndisponivel(causa instanceof Error ? causa.message : 'erro de transporte');
    }

    if (!resposta.ok) throw new ReconhecimentoFacialIndisponivel(`HTTP ${resposta.status}`);

    return this.mapear(await resposta.json().catch(() => null));
  }

  private mapear(corpo: unknown): ResultadoExtracao {
    if (typeof corpo !== 'object' || corpo === null || !('ok' in corpo)) {
      throw new ReconhecimentoFacialIndisponivel('resposta malformada');
    }
    const c = corpo as Record<string, unknown>;

    if (c.ok === false) {
      if (typeof c.motivo === 'string' && MOTIVOS.has(c.motivo)) {
        return { ok: false, motivo: c.motivo as MotivoFalhaExtracao };
      }
      throw new ReconhecimentoFacialIndisponivel('motivo de falha desconhecido');
    }

    const t = c.template as Record<string, unknown> | undefined;
    if (!t || !Array.isArray(t.vetor) || typeof t.dim !== 'number' || typeof t.modelo !== 'string') {
      throw new ReconhecimentoFacialIndisponivel('template malformado');
    }
    return {
      ok: true,
      template: { vetor: t.vetor as number[], dim: t.dim, modelo: t.modelo },
      qualidade: typeof c.qualidade === 'number' ? c.qualidade : 0,
    };
  }
}
