import { randomUUID } from 'node:crypto';
import { loadConfig, temPostgresConfigurado, readSecret } from '../config/env.js';
import { criarPool } from './pool.js';
import { aplicarMigracoes } from './migracoes.js';
import { Usuario } from '../identity/usuario.js';
import { UsuarioRepositoryPg } from '../identity/usuario-repository-pg.js';
import { seedTiposDocumento } from './seed-tipos-documento.js';

/**
 * Seed de PRODUÇÃO (idempotente e SEGURO). Diferente de `seed.ts` (DEV/DEMO), NÃO cria usuários com
 * senha fraca, fornecedores nem documentos fictícios. Semeia apenas o que produção legitimamente
 * precisa no primeiro deploy:
 *
 *   1. Catálogo de tipos de documento (RF022) — dado de referência.
 *   2. Um usuário administrador inicial, com credenciais vindas do ambiente/secret.
 *
 * As migrações rodam no boot do backend (server.ts); ainda assim as garantimos aqui para permitir
 * rodar o seed contra um banco recém-criado de forma standalone.
 *
 * Execução (imagem de produção):
 *   ADMIN_EMAIL=admin@orgao.gov.br ADMIN_PASSWORD_FILE=/run/secrets/admin_password \
 *     node dist/shared/db/seed-prod.js
 *
 * Credenciais do admin (nunca versionadas — PRJ-DEC-07):
 *   - ADMIN_EMAIL           (obrigatório) e-mail de login do administrador.
 *   - ADMIN_PASSWORD / _FILE (obrigatório) senha inicial; ≥ 12 caracteres. Prefira o secret (_FILE).
 *   - ADMIN_NOME            (opcional) nome exibido; default "Administrador".
 *   - ADMIN_LOGIN           (opcional) login; default = parte local do e-mail.
 *
 * Idempotente: se o e-mail já existir, o admin é preservado (não sobrescreve senha).
 */
const SENHA_MIN = 12;

function exigirEnv(nome: string, valor: string | undefined): string {
  if (!valor || !valor.trim()) {
    console.error(`[seed:prod] ${nome} é obrigatório. Aborting.`);
    process.exit(1);
  }
  return valor.trim();
}

async function seedProd(): Promise<void> {
  if (!temPostgresConfigurado()) {
    console.error('[seed:prod] Postgres not configured (set POSTGRES_HOST or DATABASE_URL). Aborting.');
    process.exit(1);
  }

  const email = exigirEnv('ADMIN_EMAIL', process.env.ADMIN_EMAIL);
  const senha = exigirEnv('ADMIN_PASSWORD (ou ADMIN_PASSWORD_FILE)', readSecret('ADMIN_PASSWORD'));
  if (senha.length < SENHA_MIN) {
    console.error(`[seed:prod] ADMIN_PASSWORD deve ter ao menos ${SENHA_MIN} caracteres. Aborting.`);
    process.exit(1);
  }
  const nome = process.env.ADMIN_NOME?.trim() || 'Administrador';
  const login = process.env.ADMIN_LOGIN?.trim() || email.split('@')[0];

  const config = loadConfig();
  const pool = criarPool(config.database);
  try {
    const novas = await aplicarMigracoes(pool, (m) => console.log(`[seed:prod] ${m}`));
    if (novas.length) console.log(`[seed:prod] ${novas.length} migration(s) applied.`);

    await seedTiposDocumento(pool);

    const repo = new UsuarioRepositoryPg(pool);
    if (await repo.porEmail(email)) {
      console.log(`[seed:prod] admin já existe: ${email} (senha preservada).`);
    } else {
      const admin = Usuario.criarLocal({
        id: randomUUID(), email, senha, nome, papel: 'administrador',
        fornecedorId: null, cargo: 'administrador', login, secretaria: 'CPL',
      });
      await repo.salvar(admin);
      console.log(`[seed:prod] admin criado: ${email} (administrador). Troque a senha no primeiro acesso.`);
    }
    console.log('[seed:prod] concluído.');
  } finally {
    await pool.end();
  }
}

seedProd().catch((e) => { console.error('[seed:prod] failure:', e); process.exit(1); });
