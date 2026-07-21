import { randomUUID } from 'node:crypto';
import { Documento, FormatoInvalido, type FormatoDoc, type StatusDoc } from '../domain/documento.js';
import type { PiiCipher } from '../../shared/crypto/pii-cipher.js';

/** Probe QBE (FR-015) — instância parcial de Documento usada como critério de busca (campos AND; ausentes ignorados). */
export interface DocumentoProbe {
  fornecedorId?: string;
  status?: StatusDoc;
  tipo?: string;
}

/** Paginação — parâmetro separado, FORA do probe (FR-015). */
export interface PaginacaoReq {
  page?: number; // 1-based
  size?: number;
}

export interface DocumentoRepository {
  salvar(d: Documento): Promise<void>;
  listar(fornecedorId: string): Promise<Documento[]>;
  porId(id: string): Promise<Documento | null>;
  listarPendentes(fornecedorId: string): Promise<Documento[]>;
  /** Busca por instância parcial (QBE — FR-015). */
  buscarPorExemplo(probe: DocumentoProbe, page?: PaginacaoReq): Promise<Documento[]>;
}

/** Object storage (S3) atrás de adaptador; guarda conteúdo cifrado e devolve um ponteiro. */
export interface ObjectStorage {
  put(chave: string, conteudoCifrado: string): Promise<string>; // retorna arquivoRef
  /** Recupera o conteúdo cifrado a partir do arquivoRef devolvido por `put`; null se o blob sumiu. */
  get(ref: string): Promise<string | null>;
}

const FORMATOS: FormatoDoc[] = ['pdf', 'jpg', 'png'];

/** Upload reutilizável e cifrado (FR-007/008, AD-19). Vencidos não reutilizáveis. */
export class GerirDocumentos {
  constructor(
    private readonly repo: DocumentoRepository,
    private readonly storage: ObjectStorage,
    private readonly cipher: PiiCipher,
    private readonly hoje: () => string = () => new Date().toISOString(),
  ) {}

  async enviar(input: { fornecedorId: string; tipo: string; formato: string; conteudo: string; dataValidade?: string | null }): Promise<{ documentoId: string }> {
    if (!FORMATOS.includes(input.formato as FormatoDoc)) throw new FormatoInvalido(input.formato);
    const id = randomUUID();
    const ref = await this.storage.put(`${input.fornecedorId}/${id}`, this.cipher.encrypt(input.conteudo));
    await this.repo.salvar(Documento.enviar({ id, fornecedorId: input.fornecedorId, tipo: input.tipo, arquivoRef: ref, formato: input.formato as FormatoDoc, dataValidade: input.dataValidade ?? null }));
    return { documentoId: id };
  }

  /**
   * Lista com situação vigente|expirado; só vigentes são reutilizáveis. Expõe também o `status` de
   * covalidação (pendente|aprovado|reprovado), a `dataValidade` e o `motivoReprovacao`, para o portal
   * do fornecedor derivar indicadores (aprovados/total), alertas (vencidos, a vencer em breve) e a
   * tarja "Reprovado pela CPL" (UC006/FR-010) sem novos endpoints.
   */
  async listar(fornecedorId: string): Promise<Array<{ id: string; tipo: string; situacao: 'vigente' | 'expirado'; status: StatusDoc; dataValidade: string | null; motivoReprovacao: string | null }>> {
    const hoje = this.hoje();
    return (await this.repo.listar(fornecedorId)).map((d) => ({
      id: d.id, tipo: d.tipo, situacao: d.estaVigente(hoje) ? 'vigente' : 'expirado',
      status: d.status, dataValidade: d.dataValidade, motivoReprovacao: d.motivoReprovacao,
    }));
  }

  /**
   * Recupera o arquivo para Visualizar/Baixar no portal (FR-007/008). Contraparte de `enviar`: o
   * storage devolve o blob cifrado e SÓ aqui — onde vive a `PiiCipher` — ele é decifrado (AD-19). O
   * conteúdo volta como a mesma string que foi enviada (o front trafega bytes binários em base64).
   * `null` quando o documento não existe ou o blob sumiu do storage — a borda traduz para 404.
   */
  async baixar(documentoId: string): Promise<{ tipo: string; formato: FormatoDoc; conteudo: string; dataValidade: string | null } | null> {
    const doc = await this.repo.porId(documentoId);
    if (!doc) return null;
    const cifrado = await this.storage.get(doc.arquivoRef);
    if (cifrado === null) return null;
    return { tipo: doc.tipo, formato: doc.formato, conteudo: this.cipher.decrypt(cifrado), dataValidade: doc.dataValidade };
  }
}
