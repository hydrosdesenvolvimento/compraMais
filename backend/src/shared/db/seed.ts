import { randomUUID } from 'node:crypto';
import { loadConfig, temPostgresConfigurado } from '../config/env.js';
import { criarPool } from './pool.js';
import { aplicarMigracoes } from './migracoes.js';
import { Usuario } from '../identity/usuario.js';
import { UsuarioRepositoryPg } from '../identity/usuario-repository-pg.js';
import type { Papel } from '../identity/identity-provider.js';

/**
 * Seeder de dados sintéticos da Onda 1 (DEV/DEMO — NÃO usar em produção). Idempotente: garante as
 * migrações e cria apenas o que ainda não existe (verifica por e-mail). Execução:
 *   npm run seed            (dev/tsx)            ·  node dist/shared/db/seed.js (prod)
 *   docker compose run --rm backend npm run seed (no container dev)
 *
 * Persistimos hoje a identidade (usuarios). Os demais domínios ainda são in-memory (MVP); à medida que
 * ganharem adaptador pg + migração, novos blocos de seed entram aqui.
 */
const USUARIOS_SEED: Array<{ email: string; senha: string; nome: string; papel: Papel; fornecedorId: string | null }> = [
  { email: 'admin@compramais.local', senha: 'admin12345', nome: 'Administrador CPL', papel: 'cpl', fornecedorId: null },
  { email: 'smga@compramais.local', senha: 'smga123456', nome: 'Gestor SMGA', papel: 'smga', fornecedorId: null },
  { email: 'fornecedor@demo.local', senha: 'fornecedor123', nome: 'Fornecedor Demo', papel: 'titular', fornecedorId: 'demo-fornecedor' },
];

async function seed(): Promise<void> {
  if (!temPostgresConfigurado()) {
    console.error('[seed] Postgres não configurado (defina POSTGRES_HOST ou DATABASE_URL). Abortando.');
    process.exit(1);
  }
  const config = loadConfig();
  const pool = criarPool(config.database);
  try {
    const novas = await aplicarMigracoes(pool, (m) => console.log(`[seed] ${m}`));
    if (novas.length) console.log(`[seed] ${novas.length} migração(ões) aplicada(s).`);

    const repo = new UsuarioRepositoryPg(pool);
    let criados = 0;
    for (const s of USUARIOS_SEED) {
      if (await repo.porEmail(s.email)) {
        console.log(`[seed] já existe: ${s.email}`);
        continue;
      }
      const u = Usuario.criarLocal({ id: randomUUID(), email: s.email, senha: s.senha, nome: s.nome, papel: s.papel, fornecedorId: s.fornecedorId });
      await repo.salvar(u);
      criados++;
      console.log(`[seed] criado: ${s.email} (${s.papel})`);
    }
    console.log(`[seed] concluído — ${criados} usuário(s) novo(s) de ${USUARIOS_SEED.length}.`);
  } finally {
    await pool.end();
  }
}

seed().catch((e) => { console.error('[seed] falha:', e); process.exit(1); });
