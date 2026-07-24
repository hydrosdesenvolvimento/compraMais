import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { TIPOS_DOCUMENTO_BASELINE } from '../../catalogos/domain/tipos-documento-baseline.js';

/**
 * Catálogo de Tipos de Documento (RF022 / UC020) — os "documentos exigidos" do Passo 2 do
 * credenciamento e do dropdown de upload da tela de Documentos. Sem este seed o catálogo nasce vazio
 * e ambas as telas ficam sem tipos. A lista canônica vive em `TIPOS_DOCUMENTO_BASELINE` (fonte única,
 * compartilhada com o bootstrap em memória de `buildServer`). Idempotente via índice único `lower(nome)`.
 *
 * É dado de REFERÊNCIA (não demo) — por isso vive num módulo próprio, sem efeitos colaterais no import,
 * reutilizado tanto pelo seed de DEV/DEMO (`seed.ts`) quanto pelo seed de produção (`seed-prod.ts`).
 */
export async function seedTiposDocumento(pool: Pool): Promise<number> {
  let criados = 0;
  for (const td of TIPOS_DOCUMENTO_BASELINE) {
    const r = await pool.query(
      `INSERT INTO tipos_documento (id, nome, formato, categoria, exige_validade, exige_exercicio, validade_dias, obrigatorio, situacao, last_user_update)
       VALUES ($1,$2,'pdf',$3,$4,$5,$6,$7,'ativo','seed')
       ON CONFLICT (lower(nome)) DO NOTHING`,
      [randomUUID(), td.nome, td.categoria, td.exigeValidade, td.exigeExercicio, td.validadeDias, td.obrigatorio],
    );
    if (r.rowCount) { criados++; console.log(`[seed] tipo-documento: ${td.nome}${td.obrigatorio ? ' (obrigatório)' : ''}`); }
  }
  console.log(`[seed] tipos-documento: ${criados} criado(s) de ${TIPOS_DOCUMENTO_BASELINE.length}.`);
  return criados;
}
