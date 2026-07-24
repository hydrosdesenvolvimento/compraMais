import type { Pool } from 'pg';
import { Documento, type FormatoDoc, type StatusDoc } from '../domain/documento.js';
import type { DocumentoRepository, DocumentoProbe, PaginacaoReq, ObjectStorage } from '../application/gerir-documentos.js';

/**
 * Adaptador PostgreSQL da porta DocumentoRepository (tabela `documentos`). Grava o snapshot do
 * agregado (AD-33) e o reconstrói via Documento.deEstado — mesmo contrato do adaptador em memória,
 * agora durável. Antes o repositório era só em memória: os documentos comprobatórios e a fila de
 * covalidação (UC006) se perdiam no restart do backend (mesma classe do fix de 0004/0005/0007).
 */
export class DocumentoRepositoryPg implements DocumentoRepository {
  constructor(private readonly pool: Pool) {}

  /** Upsert idempotente por `id`: reenviar/aprovar/reprovar o mesmo documento atualiza a linha. */
  async salvar(d: Documento): Promise<void> {
    const s = d.estado();
    // `fornecedor_id`, `arquivo_ref` e `register_date` são imutáveis no agregado (readonly): entram no
    // INSERT e ficam FORA do DO UPDATE — um reenvio não reatribui o dono nem reescreve o ponteiro.
    await this.pool.query(
      `INSERT INTO documentos
         (id, fornecedor_id, tipo, arquivo_ref, formato, data_validade, status, motivo_reprovacao,
          register_date, update_date, last_user_update)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         tipo = $3, formato = $5, data_validade = $6, status = $7, motivo_reprovacao = $8,
         update_date = $10, last_user_update = $11`,
      [
        s.meta.id, s.fornecedorId, s.tipo, s.arquivoRef, s.formato, s.dataValidade,
        s.status, s.motivoReprovacao,
        s.meta.registerDate, s.meta.updateDate, s.meta.lastUserUpdate,
      ],
    );
  }

  async listar(fornecedorId: string): Promise<Documento[]> {
    const r = await this.pool.query(
      'SELECT * FROM documentos WHERE fornecedor_id = $1 ORDER BY register_date, id',
      [fornecedorId],
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }

  async porId(id: string): Promise<Documento | null> {
    const r = await this.pool.query('SELECT * FROM documentos WHERE id = $1 LIMIT 1', [id]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    return row ? mapear(row) : null;
  }

  /** Fila de covalidação (UC006) — pendentes do fornecedor; delega ao QBE, como o adaptador memory. */
  async listarPendentes(fornecedorId: string): Promise<Documento[]> {
    return this.buscarPorExemplo({ fornecedorId, status: 'pendente' });
  }

  /**
   * QBE (FR-015): cada campo definido no probe filtra por igualdade (AND); ausentes ignorados.
   * SQL sempre parametrizado ($n) — entrada NUNCA concatenada. Paginação com os mesmos defaults do
   * adaptador em memória (page 1, size 20), para os dois adaptadores serem intercambiáveis.
   */
  async buscarPorExemplo(probe: DocumentoProbe, page?: PaginacaoReq): Promise<Documento[]> {
    const cond: string[] = [];
    const params: unknown[] = [];
    if (probe.fornecedorId !== undefined) { params.push(probe.fornecedorId); cond.push(`fornecedor_id = $${params.length}`); }
    if (probe.status !== undefined) { params.push(probe.status); cond.push(`status = $${params.length}`); }
    if (probe.tipo !== undefined) { params.push(probe.tipo); cond.push(`tipo = $${params.length}`); }
    const size = page?.size ?? 20;
    const p = page?.page ?? 1;
    params.push(size, (p - 1) * size);
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    // Ordem determinística (register_date, id): sem o desempate por id, documentos enviados no mesmo
    // instante poderiam trocar de página entre chamadas.
    const r = await this.pool.query(
      `SELECT * FROM documentos ${where} ORDER BY register_date, id LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return (r.rows as Record<string, unknown>[]).map(mapear);
  }
}

/**
 * Adaptador PostgreSQL da porta ObjectStorage (tabela `documentos_conteudo`). Guarda o conteúdo JÁ
 * CIFRADO pela camada de cima (AD-19) e devolve um ponteiro estável `pg://<chave>` — simétrico ao
 * `mem://<chave>` do adaptador em memória. Não decifra e não conhece a chave de cifra.
 * Placeholder durável até o object storage real (S3): a porta não muda quando o S3 entrar.
 */
export class ObjectStoragePg implements ObjectStorage {
  constructor(private readonly pool: Pool) {}

  /** Upsert idempotente por `chave`: reenviar o mesmo objeto sobrescreve o blob, sem duplicar linha. */
  async put(chave: string, conteudoCifrado: string): Promise<string> {
    await this.pool.query(
      `INSERT INTO documentos_conteudo (chave, conteudo_cifrado)
       VALUES ($1,$2)
       ON CONFLICT (chave) DO UPDATE SET conteudo_cifrado = $2, update_date = now()`,
      [chave, conteudoCifrado],
    );
    return `pg://${chave}`;
  }

  /**
   * Recupera o blob cifrado pelo ref (`pg://<chave>`) devolvido por `put`. Remove o esquema para
   * chegar à `chave` primária. Devolve null quando não há linha — a aplicação traduz para 404 sem
   * decifrar nada. Não conhece a chave de cifra: o conteúdo sobe cifrado, como desceu.
   */
  async get(ref: string): Promise<string | null> {
    const r = await this.pool.query(
      'SELECT conteudo_cifrado FROM documentos_conteudo WHERE chave = $1 LIMIT 1',
      [ref.replace(/^pg:\/\//, '')],
    );
    const row = r.rows[0] as { conteudo_cifrado: unknown } | undefined;
    return row ? String(row.conteudo_cifrado) : null;
  }
}

function mapear(row: Record<string, unknown>): Documento {
  return Documento.deEstado({
    meta: {
      id: String(row.id), registerDate: iso(row.register_date),
      updateDate: iso(row.update_date), lastUserUpdate: String(row.last_user_update),
    },
    fornecedorId: String(row.fornecedor_id),
    tipo: String(row.tipo),
    arquivoRef: String(row.arquivo_ref),
    formato: row.formato as FormatoDoc,
    dataValidade: row.data_validade == null ? null : String(row.data_validade),
    status: row.status as StatusDoc,
    motivoReprovacao: row.motivo_reprovacao == null ? null : String(row.motivo_reprovacao),
  });
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
