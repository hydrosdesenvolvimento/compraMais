# Banco de dados — migrações e seed

## Migrações

As migrações ficam em [`backend/migrations/`](../../backend/migrations/) como arquivos `NNNN_nome.sql`
(forward-only — AD-28: **nunca** alterar destrutivamente após aplicadas).

**Aplicação automática (runner).** No startup, quando há Postgres configurado (`POSTGRES_HOST`/
`DATABASE_URL` e `NODE_ENV != test`), o backend executa o runner
[`src/shared/db/migracoes.ts`](../../backend/src/shared/db/migracoes.ts):

1. aguarda o banco aceitar conexões (resiliente ao race de boot do Postgres);
2. cria a tabela de controle `schema_migrations`;
3. aplica, em ordem alfabética, cada `*.sql` ainda **não** registrado — cada um em sua própria
   transação, marcado em `schema_migrations` só após `COMMIT`.

Reexecutar é seguro (idempotente): migrações já registradas não reaplicam. No log: `migrações verificadas`.

| Migração | Conteúdo |
|---|---|
| `0001_init_audit.sql` | tabela `auditoria` (append-only) + trigger anti-mutação (AD-18) |
| `0002_init_auth.sql` | tabela `usuarios` (autenticação — 008) |

**Adicionar uma migração:** crie `backend/migrations/0003_<nome>.sql` com DDL idempotente
(`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Será aplicada no próximo startup. Em
produção, a imagem inclui `migrations/` (copiada no Dockerfile) e o runner roda no boot do container.

## Seed

[`src/shared/db/seed.ts`](../../backend/src/shared/db/seed.ts) popula dados sintéticos da **Onda 1**
(DEV/DEMO — **não** usar em produção). É **idempotente** (garante as migrações e cria só o que falta,
verificando por e-mail).

```bash
# Local (backend com Postgres acessível)
cd backend && npm run seed

# No container de desenvolvimento
docker compose run --rm backend npm run seed
```

Usuários semeados (DEV): `admin@compramais.local` (cpl), `smga@compramais.local` (smga),
`fornecedor@demo.local` (titular). Senhas são placeholders de desenvolvimento.

## Estado de persistência

Persistido em Postgres hoje: **`usuarios`** (autenticação) e **`auditoria`** (trilha append-only,
durável). Os demais domínios (catálogo, editais, credenciamento, malote, titular, painéis) usam
adaptadores **em memória** (MVP). O caminho para migrá-los é incremental e mecânico: adicionar a
migração `00NN_*.sql`, um adaptador `*-repository-pg.ts` implementando a mesma porta, e trocar a
seleção no composition root (`server.ts`) — que já alterna pg/memória conforme o `pool`.
