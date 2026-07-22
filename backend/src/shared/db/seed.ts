import { randomUUID } from 'node:crypto';
import { loadConfig, temPostgresConfigurado } from '../config/env.js';
import { criarPool } from './pool.js';
import { aplicarMigracoes } from './migracoes.js';
import { Usuario } from '../identity/usuario.js';
import { UsuarioRepositoryPg } from '../identity/usuario-repository-pg.js';
import type { Papel } from '../identity/identity-provider.js';
import { GerirDocumentos } from '../../credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryPg, ObjectStoragePg } from '../../credenciamento/adapters/documentos-pg.js';
import { PiiCipherAesGcm } from '../crypto/pii-cipher-aes.js';
import { Documento, type FormatoDoc } from '../../credenciamento/domain/documento.js';
import { Fornecedor } from '../../catalogo/domain/fornecedor.js';
import { FornecedorRepositoryPg } from '../../catalogo/adapters/fornecedor-repository-pg.js';
import type { Pool } from 'pg';

/**
 * Seeder de dados sintéticos da Onda 1 (DEV/DEMO — NÃO usar em produção). Idempotente: garante as
 * migrações e cria apenas o que ainda não existe (verifica por e-mail). Execução:
 *   npm run seed            (dev/tsx)            ·  node dist/shared/db/seed.js (prod)
 *   docker compose run --rm backend npm run seed (no container dev)
 *
 * Persistimos hoje a identidade (usuarios). Os demais domínios ainda são in-memory (MVP); à medida que
 * ganharem adaptador pg + migração, novos blocos de seed entram aqui.
 */
const USUARIOS_SEED: Array<{ email: string; senha: string; nome: string; papel: Papel; fornecedorId: string | null; cargo?: string | null; login?: string | null; secretaria?: string | null }> = [
  { email: 'administrador@compramais.local', senha: 'admin12345', nome: 'Administrador', papel: 'administrador', fornecedorId: null, cargo: 'administrador', login: 'administrador', secretaria: 'CPL' },
  { email: 'admin@compramais.local', senha: 'admin12345', nome: 'Analista CPL', papel: 'cpl', fornecedorId: null, cargo: 'analista_cpl', login: 'analista.cpl', secretaria: 'CPL' },
  { email: 'smga@compramais.local', senha: 'smga123456', nome: 'Gestor SMGA', papel: 'smga', fornecedorId: null, cargo: 'gestor', login: 'gestor.smga', secretaria: 'SEMGA' },
  { email: 'fornecedor@demo.local', senha: 'fornecedor123', nome: 'Fornecedor Demo', papel: 'titular', fornecedorId: 'demo-fornecedor' },
];

const DEMO_FORNECEDOR_ID = 'demo-fornecedor';

/**
 * Gera um PDF de 1 página REALMENTE VÁLIDO (xref com offsets corretos) e devolve seus bytes em base64.
 * O portal envia o `conteudo` do upload como base64 dos bytes do arquivo; o seed precisa fazer o mesmo
 * para que os documentos demo sejam de fato visualizáveis/baixáveis na tela (antes o conteúdo era um
 * texto `DEMO-...`, que virava um "PDF" corrompido ao abrir). Como o texto demo é sempre Latin-1, o
 * comprimento em code units coincide com o número de bytes — por isso os offsets do xref batem.
 */
function pdfDemoBase64(texto: string): string {
  const esc = texto.replace(/([\\()])/g, '\\$1');
  const conteudoStream = `BT /F1 16 Tf 24 60 Td (${esc}) Tj ET`;
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 360 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${conteudoStream.length}>>\nstream\n${conteudoStream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1').toString('base64');
}

/** Situação-alvo de cada documento demo → o seed transiciona o agregado após o upload. */
type AlvoDoc = 'aprovado' | 'reprovado' | 'pendente';

/**
 * Documentos comprobatórios do fornecedor demo (Portal do Fornecedor · tela "Gestão de Documentos").
 * Datas de validade são RELATIVAS ao momento do seed para exercitar os estados derivados na UI
 * (Aprovado · Vence em N dias · Vencido). `dias: null` = sem validade.
 */
const DOCUMENTOS_SEED: Array<{ tipo: string; formato: FormatoDoc; dias: number | null; alvo: AlvoDoc; motivo?: string }> = [
  { tipo: 'Contrato Social', formato: 'pdf', dias: 540, alvo: 'aprovado' },
  { tipo: 'Cartão CNPJ', formato: 'pdf', dias: null, alvo: 'aprovado' },
  { tipo: 'Certidão Negativa de Débitos Federais', formato: 'pdf', dias: 5, alvo: 'aprovado' },
  { tipo: 'Certidão de Regularidade do FGTS', formato: 'pdf', dias: 390, alvo: 'aprovado' },
  { tipo: 'Balanço Patrimonial 2025', formato: 'pdf', dias: null, alvo: 'reprovado', motivo: 'Imagem ilegível na página 3. Reenvie o PDF digitalizado em 300 dpi, sem cortes.' },
  { tipo: 'Atestado de Capacidade Técnica', formato: 'pdf', dias: null, alvo: 'pendente' },
];

/** Semeia os documentos do fornecedor demo (idempotente: só age se ele ainda não tem documentos). */
async function seedDocumentos(pool: Pool, piiKey: Buffer): Promise<void> {
  const repo = new DocumentoRepositoryPg(pool);
  if ((await repo.listar(DEMO_FORNECEDOR_ID)).length > 0) {
    console.log('[seed] documentos: demo-fornecedor já possui documentos, pulando.');
    return;
  }
  const docs = new GerirDocumentos(repo, new ObjectStoragePg(pool), new PiiCipherAesGcm(piiKey));
  const agora = Date.now();
  let criados = 0;
  for (const d of DOCUMENTOS_SEED) {
    const dataValidade = d.dias == null ? null : new Date(agora + d.dias * 86_400_000).toISOString();
    const { documentoId } = await docs.enviar({ fornecedorId: DEMO_FORNECEDOR_ID, tipo: d.tipo, formato: d.formato, conteudo: pdfDemoBase64(`Documento demonstrativo — ${d.tipo}`), dataValidade });
    if (d.alvo !== 'pendente') {
      const doc = await repo.porId(documentoId);
      if (doc) {
        if (d.alvo === 'aprovado') doc.aprovar('seed');
        else doc.reprovar(d.motivo ?? 'Documento reprovado.', 'seed');
        await repo.salvar(doc);
      }
    }
    criados++;
    console.log(`[seed] documento: ${d.tipo} (${d.alvo})`);
  }
  console.log(`[seed] documentos: ${criados} criado(s) para demo-fornecedor.`);
}

/**
 * Fila da tela "Análise Documental" (Painel Admin · covalidação). Semeia fornecedores em
 * `pendente_analise`, cada um com um Balanço Patrimonial pendente — o alvo da covalidação humana
 * (RN003/RF004). Sem isto a tela nasce vazia ("Nenhum documento na fila"), o que parece "em
 * construção". CNPJs são válidos (dígitos verificadores conferem — `Fornecedor.deEstado` reidrata via
 * `Cnpj.criar`). Idempotente: só age no fornecedor que ainda não existe.
 */
const ANALISE_SEED: Array<{ fornecedorId: string; razaoSocial: string; cnpj: string; porte: string; cnae: string; enviadoEm: string }> = [
  { fornecedorId: 'demo-malharia-maria', razaoSocial: 'Malharia Maria', cnpj: '12345678000195', porte: 'ME', cnae: '1412601', enviadoEm: '2026-06-15T12:00:00.000Z' },
  { fornecedorId: 'demo-textil-amazonia', razaoSocial: 'Têxtil Amazônia', cnpj: '77888999000181', porte: 'EPP', cnae: '1311100', enviadoEm: '2026-06-20T12:00:00.000Z' },
];

async function seedFilaAnalise(pool: Pool, piiKey: Buffer): Promise<void> {
  const fornecedorRepo = new FornecedorRepositoryPg(pool);
  const docRepo = new DocumentoRepositoryPg(pool);
  const storage = new ObjectStoragePg(pool);
  const cipher = new PiiCipherAesGcm(piiKey);
  let criados = 0;
  for (const s of ANALISE_SEED) {
    if (await fornecedorRepo.porId(s.fornecedorId)) {
      console.log(`[seed] análise: ${s.razaoSocial} já existe, pulando.`);
      continue;
    }
    const meta = { id: s.fornecedorId, registerDate: s.enviadoEm, updateDate: s.enviadoEm, lastUserUpdate: 'seed' };
    await fornecedorRepo.salvar(Fornecedor.deEstado({
      meta, cnpj: s.cnpj, razaoSocial: s.razaoSocial, porte: s.porte,
      cnaes: [{ codigoSubclasse: s.cnae, tipo: 'principal', ativo: true }],
      situacao: 'ativa', origem: 'manual', contato: {}, status: 'pendente_analise', sincronizadoEm: null,
    }));
    const docId = randomUUID();
    const ref = await storage.put(`${s.fornecedorId}/${docId}`, cipher.encrypt(pdfDemoBase64(`Balanço Patrimonial — ${s.razaoSocial}`)));
    await docRepo.salvar(Documento.deEstado({
      meta: { id: docId, registerDate: s.enviadoEm, updateDate: s.enviadoEm, lastUserUpdate: 'seed' },
      fornecedorId: s.fornecedorId, tipo: 'Balanço Patrimonial', arquivoRef: ref, formato: 'pdf',
      dataValidade: null, status: 'pendente', motivoReprovacao: null,
    }));
    criados++;
    console.log(`[seed] análise: ${s.razaoSocial} + Balanço Patrimonial (pendente).`);
  }
  console.log(`[seed] análise documental: ${criados} fornecedor(es) semeado(s).`);
}

/**
 * Catálogo de Tipos de Documento (RF022 / UC020) — os "documentos exigidos" do Passo 2 do
 * credenciamento e do dropdown de upload da tela de Documentos. Sem este seed o catálogo nasce vazio
 * e ambas as telas ficam sem tipos. Nomes alinhados aos documentos demo (`DOCUMENTOS_SEED`) para o
 * fornecedor demo exibir o reaproveitamento (A1). Idempotente via índice único `lower(nome)`.
 */
const TIPOS_DOCUMENTO_SEED: Array<{ nome: string; categoria: 'cadastral' | 'fiscal' | 'contratual'; exigeValidade: boolean; exigeExercicio: boolean; validadeDias: number | null; obrigatorio: boolean }> = [
  // `obrigatorio` é parametrizável (RF022 / §02) — o Administrador ajusta na tela "Tipos de Arquivos".
  // Defaults abaixo espelham os documentos do protótipo (portal-fornecedor.html) marcados como exigidos;
  // Atestado de Capacidade Técnica fica opcional (só consta do rascunho v1.0 descartado, não canônico).
  { nome: 'Cartão CNPJ', categoria: 'cadastral', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: true },
  { nome: 'Contrato Social', categoria: 'contratual', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Federais', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 180, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Estaduais', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 90, obrigatorio: true },
  { nome: 'Certidão Negativa de Débitos Trabalhistas (CNDT)', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 180, obrigatorio: true },
  { nome: 'Certidão de Regularidade do FGTS', categoria: 'fiscal', exigeValidade: true, exigeExercicio: false, validadeDias: 90, obrigatorio: true },
  { nome: 'Balanço Patrimonial', categoria: 'contratual', exigeValidade: false, exigeExercicio: true, validadeDias: null, obrigatorio: true },
  { nome: 'Atestado de Capacidade Técnica', categoria: 'contratual', exigeValidade: false, exigeExercicio: false, validadeDias: null, obrigatorio: false },
];

/** Semeia o catálogo de tipos de documento (idempotente: `ON CONFLICT (lower(nome)) DO NOTHING`). */
async function seedTiposDocumento(pool: Pool): Promise<void> {
  let criados = 0;
  for (const td of TIPOS_DOCUMENTO_SEED) {
    const r = await pool.query(
      `INSERT INTO tipos_documento (id, nome, formato, categoria, exige_validade, exige_exercicio, validade_dias, obrigatorio, situacao, last_user_update)
       VALUES ($1,$2,'pdf',$3,$4,$5,$6,$7,'ativo','seed')
       ON CONFLICT (lower(nome)) DO NOTHING`,
      [randomUUID(), td.nome, td.categoria, td.exigeValidade, td.exigeExercicio, td.validadeDias, td.obrigatorio],
    );
    if (r.rowCount) { criados++; console.log(`[seed] tipo-documento: ${td.nome}${td.obrigatorio ? ' (obrigatório)' : ''}`); }
  }
  console.log(`[seed] tipos-documento: ${criados} criado(s) de ${TIPOS_DOCUMENTO_SEED.length}.`);
}

async function seed(): Promise<void> {
  if (!temPostgresConfigurado()) {
    console.error('[seed] Postgres not configured (set POSTGRES_HOST or DATABASE_URL). Aborting.');
    process.exit(1);
  }
  const config = loadConfig();
  const pool = criarPool(config.database);
  try {
    const novas = await aplicarMigracoes(pool, (m) => console.log(`[seed] ${m}`));
    if (novas.length) console.log(`[seed] ${novas.length} migration(s) applied.`);

    const repo = new UsuarioRepositoryPg(pool);
    let criados = 0;
    let falhas = 0;
    for (const s of USUARIOS_SEED) {
      try {
        if (await repo.porEmail(s.email)) {
          console.log(`[seed] already exists: ${s.email}`);
          continue;
        }
        const u = Usuario.criarLocal({ id: randomUUID(), email: s.email, senha: s.senha, nome: s.nome, papel: s.papel, fornecedorId: s.fornecedorId, cargo: s.cargo ?? null, login: s.login ?? null, secretaria: s.secretaria ?? null });
        await repo.salvar(u);
        criados++;
        console.log(`[seed] created: ${s.email} (${s.papel})`);
      } catch (e) {
        falhas++;
        console.error(`[seed] FAILURE for ${s.email}: ${(e as Error).message}`);
      }
    }
    console.log(`[seed] completed — ${criados} new, ${falhas} failure(s) of ${USUARIOS_SEED.length}.`);
    if (falhas) process.exitCode = 1; // visível em CI sem abortar os demais

    await seedTiposDocumento(pool);
    await seedDocumentos(pool, config.crypto.piiKey);
    await seedFilaAnalise(pool, config.crypto.piiKey);
  } finally {
    await pool.end();
  }
}

seed().catch((e) => { console.error('[seed] failure:', e); process.exit(1); });
