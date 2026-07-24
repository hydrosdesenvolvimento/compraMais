import type { Pool } from 'pg';
import type { PiiCipher } from '../../shared/crypto/pii-cipher.js';
import type { ReferenciaBiometrica } from '../domain/biometria.js';
import type { BiometriaRepository } from '../application/biometria-repository.js';

/**
 * Adaptador PostgreSQL da referência biométrica (tabela `fornecedor_biometria`, migração 0027).
 * O embedding é CIFRADO em repouso (PiiCipher AES-256-GCM, AD-19) — dado biométrico é sensível na
 * LGPD (art. 11). Serializa o vetor como JSON, cifra e grava como `text`; na leitura decifra e reidrata.
 * Uma referência por fornecedor (ON CONFLICT no fornecedor_id → recadastro sobrescreve).
 */
export class BiometriaRepositoryPg implements BiometriaRepository {
  constructor(private readonly pool: Pool, private readonly cipher: PiiCipher) {}

  async salvarReferencia(ref: ReferenciaBiometrica): Promise<void> {
    const template = this.cipher.encrypt(JSON.stringify(ref.template.vetor));
    await this.pool.query(
      `INSERT INTO fornecedor_biometria (fornecedor_id, usuario_id, template, modelo, dim, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (fornecedor_id) DO UPDATE SET
         usuario_id = $2, template = $3, modelo = $4, dim = $5, atualizado_em = $7`,
      [ref.fornecedorId, ref.usuarioId, template, ref.template.modelo, ref.template.dim, ref.criadoEm, ref.atualizadoEm],
    );
  }

  async referenciaPorFornecedor(fornecedorId: string): Promise<ReferenciaBiometrica | null> {
    const r = await this.pool.query('SELECT * FROM fornecedor_biometria WHERE fornecedor_id = $1 LIMIT 1', [fornecedorId]);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const vetor = JSON.parse(this.cipher.decrypt(String(row.template))) as number[];
    return {
      fornecedorId: String(row.fornecedor_id),
      usuarioId: String(row.usuario_id),
      template: { vetor, dim: Number(row.dim), modelo: String(row.modelo) },
      criadoEm: iso(row.criado_em),
      atualizadoEm: iso(row.atualizado_em),
    };
  }
}

function iso(v: unknown): string { return v instanceof Date ? v.toISOString() : String(v); }
