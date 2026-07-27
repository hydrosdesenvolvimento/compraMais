# backend/scripts — utilitários operacionais de banco

Scripts executados **dentro do container do banco** (PRJ-DEC-05 — nada roda no host).
Não são migrações: o runner de migrações lê apenas `backend/migrations/*.sql` e ignora esta pasta.

## Carga completa dos CNAEs do Brasil (RF021 — Setores Industriais)

| Arquivo | Papel |
|---|---|
| [seed-cnae-brasil.sql](seed-cnae-brasil.sql) | Script SQL versionado com as **1.332 subclasses CNAE 2.3** (fonte: IBGE). É o que roda no container do banco. |
| [seed-cnae-brasil.sh](seed-cnae-brasil.sh) | Wrapper que aplica o SQL via `docker compose exec` (dev) ou `docker exec` (prod/Swarm). |
| [gerar-seed-cnae.mjs](gerar-seed-cnae.mjs) | Regenera o `.sql` a partir da API pública do IBGE. Roda no host (precisa de rede). |

### Pré-requisito

Migrações aplicadas — em especial `0011_init_catalogos.sql` (tabela `setores_cnae`) e
`0021_setores_cnae_categoria.sql` (coluna `categoria`). O script falha cedo, com mensagem explícita,
se o schema não estiver migrado.

### Execução

Há dois caminhos para a **mesma** carga, com o **mesmo** `.sql`:

| Caminho | Quando |
|---|---|
| `npm run seed:prod` (backend) | Primeiro deploy / provisionamento — o CNAE entra junto com tipos de documento e admin inicial. |
| `seed-cnae-brasil.sh` (psql no container do banco) | Recarga avulsa, ambiente já provisionado, ou atualização da nomenclatura sem redeploy. |

O caminho do backend é `src/shared/db/seed-setores-cnae.ts`, que lê e executa este mesmo arquivo via
node-pg — por isso o `.sql` **não pode conter meta-comando de psql** (`\set`, `\timing`, `\i`), regra
travada por teste (`tests/unit/seed-setores-cnae.spec.ts`). Na imagem de produção o arquivo é copiado
pelo `Dockerfile` (`COPY scripts/seed-cnae-brasil.sql`).

```bash
# DEV (compose, profile dev)
backend/scripts/seed-cnae-brasil.sh

# ou, direto no psql do container:
docker compose --profile dev exec -T db \
  psql -v ON_ERROR_STOP=1 -U compramais -d compramais < backend/scripts/seed-cnae-brasil.sql

# PROD (Swarm/Portainer — descubra o container do serviço db da stack)
DB_CONTAINER=$(docker ps -q -f name=compramais_db) backend/scripts/seed-cnae-brasil.sh
```

Variáveis opcionais do wrapper: `POSTGRES_USER`, `POSTGRES_DB`, `COMPOSE_PROFILE`, `DB_SERVICE`,
`DB_CONTAINER`. Nenhuma senha é lida ou impressa — a conexão usa o socket local do container.

Ao final o script imprime o resumo `total_no_catalogo | ativos | oriundos_do_seed`.

### Garantias

- **Idempotente**: transação única; reexecutar não duplica (`INSERT 0 0` na segunda rodada).
- **Não destrutivo** (AD-28 / forward-only): nunca apaga nem inativa setor existente — editais já
  publicados podem tê-lo exigido (RF003/RN001).
- **Preserva edição manual**: descrição/categoria só são atualizadas nas linhas cujo
  `last_user_update` ainda é `seed-cnae-brasil`. O que um admin editou na tela permanece intacto.

### Convenções de dados

- `codigo`: subclasse de **7 dígitos**, mesma regra do domínio (`SetorCnae` / `CnaeInvalido`), que é a
  chave natural do catálogo e a base do match fornecedor × edital.
- `descricao`: texto oficial do IBGE, **em caixa alta**, igual à nomenclatura usada nos dados de CNPJ
  da Receita — facilita conferência e busca contra a origem.
- `categoria`: descrição da **seção CNAE** (A–U, 21 valores) — agrupamento exibido na coluna
  "Categoria" da tela de Setores Industriais.
- `situacao`: `ativo`.

### Atualização da nomenclatura

Quando o IBGE publicar revisão da CNAE:

```bash
node backend/scripts/gerar-seed-cnae.mjs   # regenera o .sql (host, com rede)
git diff backend/scripts/seed-cnae-brasil.sql
```

Reaplique o script no container (ou rode `npm run seed:prod` no próximo deploy): novos códigos entram e
os textos ainda não editados manualmente são atualizados. Códigos extintos **não** são removidos — se
for necessário retirá-los de circulação, use a inativação lógica pela tela do catálogo.

### Testes

- `backend/tests/unit/seed-setores-cnae.spec.ts` — asset alcançável, SQL puro (sem meta-comando),
  1.332 códigos únicos de 7 dígitos válidos no domínio, sem `DELETE`/`TRUNCATE`. Roda no gate padrão.
- `backend/tests/integration/seed-cnae-pg.spec.ts` — Postgres real (opt-in por `POSTGRES_HOST`):
  carga completa, 21 seções, idempotência e preservação de edição manual.

```bash
docker compose --profile dev up -d db
docker compose --profile test run --rm -e POSTGRES_HOST=db -e POSTGRES_PASSWORD=changeme \
  backend-test sh -c "npm ci && npx vitest run tests/integration/seed-cnae-pg.spec.ts"
```
