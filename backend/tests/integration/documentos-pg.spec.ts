import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { DocumentoRepositoryPg, ObjectStoragePg } from '../../src/credenciamento/adapters/documentos-pg.js';
import { GerirDocumentos } from '../../src/credenciamento/application/gerir-documentos.js';
import { PiiCipherDev } from '../../src/credenciamento/adapters/documentos-memory.js';

/**
 * Integração REAL contra Postgres (AD-19 / AD-28) — sem fake de driver: exercita o SQL de verdade
 * (upsert, índices parciais, QBE parametrizado). Isolado num schema próprio e descartável, para não
 * tocar os dados de dev; aplica só a migração 0018 (as tabelas de documentos são autocontidas).
 *
 * Opt-in por `POSTGRES_HOST` (mesma convenção de `configuradoPostgres()` em shared/config/env.ts):
 * sem banco configurado a suíte é PULADA, mantendo `docker compose --profile test` (que não sobe o db)
 * verde. Para rodar com banco real:
 *   docker compose --profile test run --rm -e POSTGRES_HOST=db -e POSTGRES_PASSWORD=changeme \
 *     backend-test npx vitest run tests/integration/documentos-pg.spec.ts
 */
const TEM_BANCO = Boolean(process.env.POSTGRES_HOST ?? process.env.DATABASE_URL);
const SCHEMA = `teste_docs_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const MIGRACAO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations', '0018_init_documentos.sql');

function criarPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST ?? 'db',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? 'compramais',
    user: process.env.POSTGRES_USER ?? 'compramais',
    password: process.env.POSTGRES_PASSWORD ?? 'changeme',
    max: 4,
    options: `-c search_path=${SCHEMA}`, // todas as conexões do pool enxergam só o schema de teste
  });
}

describe.skipIf(!TEM_BANCO)('DocumentoRepositoryPg / ObjectStoragePg — durabilidade real (AD-19)', () => {
  let pool: Pool;
  let repo: DocumentoRepositoryPg;

  beforeAll(async () => {
    const admin = new Pool({
      host: process.env.POSTGRES_HOST ?? 'db',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'compramais',
      user: process.env.POSTGRES_USER ?? 'compramais',
      password: process.env.POSTGRES_PASSWORD ?? 'changeme',
    });
    await admin.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await admin.query(`SET search_path TO ${SCHEMA}`);
    // a própria migração de produção, sem adaptação — se ela quebrar, o teste quebra
    await admin.query(`SET search_path TO ${SCHEMA}; ${readFileSync(MIGRACAO, 'utf8')}`);
    await admin.end();

    pool = criarPool();
    repo = new DocumentoRepositoryPg(pool);
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    const admin = new Pool({
      host: process.env.POSTGRES_HOST ?? 'db',
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? 'compramais',
      user: process.env.POSTGRES_USER ?? 'compramais',
      password: process.env.POSTGRES_PASSWORD ?? 'changeme',
    });
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.end();
  });

  const doc = (id: string, over: Partial<{ fornecedorId: string; tipo: string; status: string }> = {}) =>
    Documento.enviar({
      id, fornecedorId: over.fornecedorId ?? 'f1', tipo: over.tipo ?? 'balanco',
      arquivoRef: `pg://${over.fornecedorId ?? 'f1'}/${id}`, formato: 'pdf', userName: 'fornecedor@x',
    });

  // ---------------------------------------------------------------- //
  // O TESTE QUE IMPORTA: hoje o documento evapora no restart.         //
  // ---------------------------------------------------------------- //
  it('o documento SOBREVIVE ao restart do backend (pool novo, repositório novo)', async () => {
    const d = doc('sobrevive-1');
    await repo.salvar(d);

    // Simula o restart: derruba TODAS as conexões e reconstrói pool + repositório do zero.
    // Com o adaptador em memória (o defeito) o Map morre aqui e o documento some.
    await pool.end();
    pool = criarPool();
    repo = new DocumentoRepositoryPg(pool);

    const lido = await repo.porId('sobrevive-1');
    expect(lido).not.toBeNull();
    expect(lido!.estado()).toEqual(d.estado());
  });

  it('a fila de covalidação (UC006) sobrevive ao restart', async () => {
    await repo.salvar(doc('fila-1', { fornecedorId: 'fq' }));
    await repo.salvar(doc('fila-2', { fornecedorId: 'fq', tipo: 'certidao' }));
    const aprovado = doc('fila-3', { fornecedorId: 'fq' });
    aprovado.aprovar('analista@cpl');
    await repo.salvar(aprovado);

    await pool.end();
    pool = criarPool();
    repo = new DocumentoRepositoryPg(pool);

    const pendentes = await repo.listarPendentes('fq');
    expect(pendentes.map((d) => d.id).sort()).toEqual(['fila-1', 'fila-2']);
  });

  it('o conteúdo cifrado sobrevive e o ponteiro devolvido é `pg://<chave>`', async () => {
    const storage = new ObjectStoragePg(pool);
    const ref = await storage.put('f1/doc-blob', 'CONTEUDO-CIFRADO-XYZ');
    expect(ref).toBe('pg://f1/doc-blob');

    const r = await pool.query('SELECT conteudo_cifrado FROM documentos_conteudo WHERE chave = $1', ['f1/doc-blob']);
    expect(r.rows[0].conteudo_cifrado).toBe('CONTEUDO-CIFRADO-XYZ');
  });

  it('o storage guarda o conteúdo CIFRADO — o texto em claro não vai ao banco (AD-19)', async () => {
    const g = new GerirDocumentos(repo, new ObjectStoragePg(pool), new PiiCipherDev());
    const { documentoId } = await g.enviar({
      fornecedorId: 'f-pii', tipo: 'contrato_social', formato: 'pdf', conteudo: 'CPF 123.456.789-00 do sócio',
    });

    const r = await pool.query('SELECT chave, conteudo_cifrado FROM documentos_conteudo WHERE chave = $1', [`f-pii/${documentoId}`]);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].conteudo_cifrado).not.toContain('123.456.789-00');
    expect(new PiiCipherDev().decrypt(r.rows[0].conteudo_cifrado)).toBe('CPF 123.456.789-00 do sócio');

    const salvo = await repo.porId(documentoId);
    expect(salvo!.arquivoRef).toBe(`pg://f-pii/${documentoId}`);
  });

  it('put é idempotente: reenviar a mesma chave sobrescreve o blob sem duplicar linha', async () => {
    const storage = new ObjectStoragePg(pool);
    await storage.put('f1/idem', 'v1');
    await storage.put('f1/idem', 'v2');

    const r = await pool.query('SELECT conteudo_cifrado FROM documentos_conteudo WHERE chave = $1', ['f1/idem']);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].conteudo_cifrado).toBe('v2');
  });

  it('salvar é idempotente: o veredito da covalidação atualiza a linha, não duplica', async () => {
    const d = doc('idem-doc', { fornecedorId: 'f-idem' });
    await repo.salvar(d);
    d.reprovar('ilegível', 'analista@cpl');
    await repo.salvar(d);

    const todos = await repo.listar('f-idem');
    expect(todos).toHaveLength(1);
    expect(todos[0].status).toBe('reprovado');
    expect(todos[0].motivoReprovacao).toBe('ilegível');
  });

  it('QBE: probe parcial filtra por AND; campos ausentes são ignorados', async () => {
    await repo.salvar(doc('q1', { fornecedorId: 'fq2', tipo: 'balanco' }));
    await repo.salvar(doc('q2', { fornecedorId: 'fq2', tipo: 'certidao' }));
    const reprovado = doc('q3', { fornecedorId: 'fq2', tipo: 'balanco' });
    reprovado.reprovar('ilegível', 'analista@cpl');
    await repo.salvar(reprovado);
    await repo.salvar(doc('q4', { fornecedorId: 'outro', tipo: 'balanco' }));

    // probe cheio
    expect((await repo.buscarPorExemplo({ fornecedorId: 'fq2', status: 'reprovado', tipo: 'balanco' })).map((d) => d.id))
      .toEqual(['q3']);
    // probe parcial: sem `tipo` → traz os dois pendentes do fornecedor
    expect((await repo.buscarPorExemplo({ fornecedorId: 'fq2', status: 'pendente' })).map((d) => d.id).sort())
      .toEqual(['q1', 'q2']);
    // probe só por tipo → cruza fornecedores
    expect((await repo.buscarPorExemplo({ tipo: 'certidao' })).map((d) => d.id)).toContain('q2');
  });

  it('QBE: probe vazio não filtra nada (contagem global do funil — server.ts)', async () => {
    const r = await repo.buscarPorExemplo({ status: 'pendente' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.status === 'pendente')).toBe(true);
  });

  it('QBE: paginação fatia o resultado e não repete itens entre páginas', async () => {
    for (const i of [1, 2, 3]) await repo.salvar(doc(`pag-${i}`, { fornecedorId: 'fpag' }));

    const p1 = await repo.buscarPorExemplo({ fornecedorId: 'fpag' }, { page: 1, size: 2 });
    const p2 = await repo.buscarPorExemplo({ fornecedorId: 'fpag' }, { page: 2, size: 2 });
    expect(p1).toHaveLength(2);
    expect(p2).toHaveLength(1);
    expect(p1.map((d) => d.id)).not.toContain(p2[0].id);
  });

  it('QBE: entrada maliciosa é tratada como dado (SQL parametrizado), não como SQL', async () => {
    const r = await repo.buscarPorExemplo({ fornecedorId: "f1'; DROP TABLE documentos; --" });
    expect(r).toEqual([]);
    // a tabela continua de pé
    await expect(pool.query('SELECT 1 FROM documentos LIMIT 1')).resolves.toBeDefined();
  });
});
