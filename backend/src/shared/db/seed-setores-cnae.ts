import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

// `scripts/` fica na raiz do backend; resolvido relativo a este módulo tanto em dist quanto em src
// (dist/shared/db/.. ou src/shared/db/.. → ../../../scripts). Mesma convenção de `migracoes.ts`.
// Na imagem de produção o arquivo é copiado pelo Dockerfile (COPY scripts/seed-cnae-brasil.sql).
export const CNAE_SQL_PATH = join(
  dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'seed-cnae-brasil.sql',
);

/** Lê o script versionado com as subclasses CNAE. Exportado para o teste do asset. */
export function lerScriptCnae(): string {
  return readFileSync(CNAE_SQL_PATH, 'utf8');
}

/**
 * Catálogo de Setores Industriais / CNAE (RF021) — as 1.332 subclasses da CNAE 2.3 (IBGE) que
 * sustentam o "CNAE exigido" do edital e o match do fornecedor (RF003/RN001). Sem esta carga o
 * catálogo nasce vazio e nenhum edital consegue exigir setor sem cadastro manual.
 *
 * Dado de REFERÊNCIA (não demo) — por isso roda no seed de produção, ao lado de `seedTiposDocumento`.
 *
 * FONTE ÚNICA: executa o mesmo `backend/scripts/seed-cnae-brasil.sql` aplicado por psql dentro do
 * container do banco (PRJ-DEC-17). Nada de lista duplicada em TypeScript — o que roda aqui e o que o
 * DBA roda no container são byte a byte o mesmo arquivo. O script é idempotente, transacional, não
 * apaga nem inativa setor existente e só reescreve descrição/categoria das linhas que ainda são dele
 * (`last_user_update = 'seed-cnae-brasil'`), preservando edições feitas pela tela do catálogo.
 */
export async function seedSetoresCnae(pool: Pool): Promise<{ total: number; criados: number }> {
  // Contagem prévia tolerante: se a tabela ainda não existe, quem reporta é a guarda do próprio
  // script (mensagem apontando a migração faltante), não um erro cru de `count(*)`.
  const antes = await contar(pool).catch(() => null);
  await pool.query(lerScriptCnae());
  const total = await contar(pool);
  const criados = antes === null ? total : total - antes;
  console.log(`[seed] setores-cnae: ${criados} criado(s); ${total} no catálogo.`);
  return { total, criados };
}

async function contar(pool: Pool): Promise<number> {
  const { rows } = await pool.query<{ n: string }>('SELECT count(*)::text AS n FROM setores_cnae');
  return Number(rows[0]?.n ?? 0);
}
