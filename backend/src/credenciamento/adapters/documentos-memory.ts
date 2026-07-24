import type { Documento } from '../domain/documento.js';
import type { DocumentoRepository, DocumentoProbe, PaginacaoReq, ObjectStorage } from '../application/gerir-documentos.js';
import type { PiiCipher } from '../../shared/crypto/pii-cipher.js';

export class DocumentoRepositoryMemory implements DocumentoRepository {
  private readonly map = new Map<string, Documento>();
  async salvar(d: Documento): Promise<void> { this.map.set(d.id, d); }
  async listar(fornecedorId: string): Promise<Documento[]> {
    return [...this.map.values()].filter((d) => d.fornecedorId === fornecedorId);
  }
  async porId(id: string): Promise<Documento | null> { return this.map.get(id) ?? null; }
  async listarPendentes(fornecedorId: string): Promise<Documento[]> {
    return this.buscarPorExemplo({ fornecedorId, status: 'pendente' });
  }

  /** QBE (FR-015): cada campo definido no probe filtra por igualdade (AND); ausentes ignorados. */
  async buscarPorExemplo(probe: DocumentoProbe, page?: PaginacaoReq): Promise<Documento[]> {
    const todos = [...this.map.values()].filter((d) =>
      (probe.fornecedorId === undefined || d.fornecedorId === probe.fornecedorId) &&
      (probe.status === undefined || d.status === probe.status) &&
      (probe.tipo === undefined || d.tipo === probe.tipo));
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    return todos.slice((p - 1) * size, (p - 1) * size + size);
  }
}

export class ObjectStorageMemory implements ObjectStorage {
  private readonly map = new Map<string, string>();
  async put(chave: string, conteudoCifrado: string): Promise<string> {
    this.map.set(chave, conteudoCifrado); // cifrado em repouso (AD-19)
    return `mem://${chave}`;
  }

  /** Recupera pelo ref do put, removendo o esquema `mem://`. Devolve o blob cifrado ou null. */
  async get(ref: string): Promise<string | null> {
    return this.map.get(ref.replace(/^mem:\/\//, '')) ?? null;
  }
}

/** Cifra de PII trivial para MVP/teste (NÃO usar em produção — usar AES-256-GCM com chave do secret manager). */
export class PiiCipherDev implements PiiCipher {
  encrypt(plaintext: string): string { return Buffer.from(plaintext, 'utf8').toString('base64'); }
  decrypt(blob: string): string { return Buffer.from(blob, 'base64').toString('utf8'); }
}
