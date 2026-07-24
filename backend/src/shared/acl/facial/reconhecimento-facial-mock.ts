import { createHash } from 'node:crypto';
import type {
  MotivoFalhaExtracao,
  ReconhecimentoFacialGateway,
  ResultadoExtracao,
  Template,
} from './reconhecimento-facial-gateway.js';

export interface OpcoesMockFacial {
  readonly dim?: number;
  readonly modelo?: string;
}

/**
 * Mock do motor facial (UC007). Determinístico: a MESMA imagem gera SEMPRE o mesmo template,
 * imagens diferentes geram templates diferentes — o suficiente para exercitar match/no-match
 * sem baixar redes neurais, rodando offline no container (DEC-STR-34, espelha ReceitaMockGateway).
 *
 * O adaptador real (serviço Python InsightFace) troca apenas a extração; o contrato tipado
 * ({@link ResultadoExtracao}) permanece.
 *
 * Sentinelas para exercitar os ramos de falha nos testes de controller/caso de uso:
 *   - buffer vazio ............ rosto_nao_detectado
 *   - prefixo "FACE:NONE" ..... rosto_nao_detectado
 *   - prefixo "FACE:MULTI" .... multiplos_rostos
 *   - prefixo "FACE:BLUR" ..... qualidade_baixa
 */
export class ReconhecimentoFacialMockGateway implements ReconhecimentoFacialGateway {
  private readonly dim: number;
  private readonly modelo: string;

  constructor(opts: OpcoesMockFacial = {}) {
    this.dim = opts.dim ?? 512;
    this.modelo = opts.modelo ?? 'mock-arcface';
  }

  async extrairTemplate(imagem: Buffer): Promise<ResultadoExtracao> {
    const falha = this.sentinela(imagem);
    if (falha) return { ok: false, motivo: falha };

    return { ok: true, template: this.templateDeterministico(imagem), qualidade: 0.99 };
  }

  private sentinela(imagem: Buffer): MotivoFalhaExtracao | null {
    if (imagem.length === 0) return 'rosto_nao_detectado';
    const cabecalho = imagem.subarray(0, 10).toString('ascii');
    if (cabecalho.startsWith('FACE:NONE')) return 'rosto_nao_detectado';
    if (cabecalho.startsWith('FACE:MULTI')) return 'multiplos_rostos';
    if (cabecalho.startsWith('FACE:BLUR')) return 'qualidade_baixa';
    return null;
  }

  /** Vetor pseudoaleatório porém estável por conteúdo (xorshift32 semeado no SHA-256 da imagem), L2-normalizado. */
  private templateDeterministico(imagem: Buffer): Template {
    const semente = createHash('sha256').update(imagem).digest();
    let estado = semente.readUInt32BE(0) || 0x9e3779b9;

    const vetor: number[] = new Array(this.dim);
    for (let i = 0; i < this.dim; i++) {
      estado ^= estado << 13; estado >>>= 0;
      estado ^= estado >> 17;
      estado ^= estado << 5; estado >>>= 0;
      vetor[i] = (estado / 0xffffffff) * 2 - 1; // [-1, 1]
    }

    const norma = Math.sqrt(vetor.reduce((s, v) => s + v * v, 0)) || 1;
    return { vetor: vetor.map((v) => v / norma), dim: this.dim, modelo: this.modelo };
  }
}
