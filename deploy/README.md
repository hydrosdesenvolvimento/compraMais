# Deploy — Docker Swarm + Portainer (GHCR)

Runbook de produção do **compraMais**. Modelo de release: **pull das imagens do
GHCR, sem build em produção** (PRJ-DEC-06). O pipeline (`.github/workflows/ci.yml`)
testa, constrói e publica as imagens; o Portainer/Swarm apenas puxa e implanta.

| Artefato | Papel |
|---|---|
| [`compramais-stack.yml`](compramais-stack.yml) | Stack de produção que o Portainer consome (Swarm). Só serviços de prod, imagens do GHCR. |
| [`stack.env.example`](stack.env.example) | Variáveis de ambiente do stack (sem segredos). Copie para `stack.env`. |
| `../.github/workflows/ci.yml` | Pipeline: lint/typecheck/test em container → build+push GHCR → (opcional) webhook Portainer. |

> **Por que um stack separado do `docker-compose.yml` da raiz?**
> `docker stack deploy` e o deploy de Swarm do Portainer **ignoram `profiles:`**.
> O compose da raiz (dev/test/prod-referência, PRJ-DEC-05) traria serviços de
> desenvolvimento para a stack de produção. Este arquivo é o artefato inequívoco
> de prod. Mantenha os dois em sincronia quando mudar env/imagens.

## Imagens publicadas

O CI publica três imagens (tags: `sha-<commit>`, nome do branch, `latest` no
branch default, e `vX.Y.Z`/`X.Y` em tags semânticas):

```
ghcr.io/hydrosdesenvolvimento/compramais/backend
ghcr.io/hydrosdesenvolvimento/compramais/frontend
ghcr.io/hydrosdesenvolvimento/compramais/face-service
```

## Pré-requisitos (uma vez por cluster)

### 1. Swarm inicializado e Portainer no manager

```bash
docker swarm init                      # se ainda não for um Swarm
# Portainer Agent/Server já gerenciando este endpoint Swarm.
```

### 2. Credencial do GHCR (imagens privadas)

Se o pacote GHCR for **privado**, os nós precisam autenticar para o pull.

- **Portainer:** *Registries → Add registry → Custom*, URL `ghcr.io`, usuário =
  seu login GitHub, senha = um **PAT (classic)** com escopo `read:packages`.
  Selecione esse registry ao criar/atualizar o stack.
- **CLI:** `docker login ghcr.io -u <user> -p <PAT>` e faça o deploy com
  `--with-registry-auth` (propaga a credencial aos nós).

Pacote **público**: nada a fazer.

### 3. Docker secrets (PRJ-DEC-07 — nunca versionados)

Crie no **Portainer → Secrets** ou via CLI num nó manager:

```bash
# Senha do Postgres
openssl rand -base64 24 | tr -d '\n' | docker secret create db_password -

# Segredo de assinatura do JWT (HS256) — sem ele o backend NÃO sobe (AD-20/AD-29)
openssl rand -base64 48 | docker secret create jwt_secret -

# Chave da cifra de PII em repouso (AES-256-GCM, AD-19) — EXATAMENTE 32 bytes
openssl rand -base64 32 | docker secret create pii_encryption_key -

# (Somente se SEI_PROVIDER=web) senha do usuário do SEI
printf '<senha-do-sei>' | docker secret create sei_senha -
```

> ⚠️ **`pii_encryption_key` é irreversível:** perdê-la/rotacioná-la torna os
> documentos já gravados indecifráveis (não há reencriptação automática). Guarde-a
> com o mesmo cuidado do backup.

## Deploy pelo Portainer (recomendado)

1. **Stacks → Add stack → nome `compramais`.**
2. **Build method:**
   - **Git repository** (recomendado): URL do repo, ref do branch/tag,
     *Compose path* = `deploy/compramais-stack.yml`. Habilite *Automatic updates*
     (polling ou webhook) para redeploy ao mudar o arquivo.
   - **Web editor**: cole o conteúdo de `compramais-stack.yml`.
3. **Environment variables:** cole os pares de `stack.env` (a partir de
   `stack.env.example`), ajustando `GHCR_REPOSITORY`, `IMAGE_TAG`, domínio e CORS.
4. Selecione o **registry do GHCR** (passo 2) se as imagens forem privadas.
5. **Deploy the stack.** As migrations rodam no startup do backend.

## Deploy pelo CLI (alternativa)

```bash
cd deploy
cp stack.env.example stack.env         # ajuste os valores
set -a && . ./stack.env && set +a
docker stack deploy -c compramais-stack.yml --with-registry-auth compramais
```

## Atualizar (nova release)

O rolling update (`order: start-first`, `failure_action: rollback`) troca as
réplicas sem downtime e reverte sozinho se a nova versão não estabilizar.

- **Tag imutável (recomendado p/ rastreabilidade):** mude `IMAGE_TAG` para
  `sha-<commit>` ou `vX.Y.Z` e redeploy o stack.
- **`latest`:** um redeploy do stack (webhook/CLI) força o re-pull. Via Portainer,
  marque *Re-pull image* / *Pull latest image* ao atualizar.

### Redeploy automático via webhook do Portainer (opcional)

1. No stack do Portainer, habilite **Webhooks** e copie a URL gerada.
2. No GitHub: **Settings → Secrets and variables → Actions**, crie o secret
   `PORTAINER_WEBHOOK_URL` com essa URL.
3. A partir daí, todo push em `main` que publicar imagens dispara o redeploy
   (job `deploy` do CI). Sem o secret, o job apenas registra e é ignorado.

## Verificação pós-deploy

```bash
docker stack services compramais           # réplicas 2/2 (backend, frontend), 1/1 (db, face)
docker service logs compramais_backend --since 5m
curl -fsS http://<host>/health             # backend via proxy do frontend → { ok: true }
```

## Rollback manual

```bash
docker service rollback compramais_backend
docker service rollback compramais_frontend
# ou reimplante o stack com o IMAGE_TAG anterior.
```

## Notas

- **TLS/domínio:** o `frontend` publica HTTP na `FRONTEND_PUBLIC_PORT`. Coloque um
  proxy reverso com TLS (Traefik/Nginx/Caddy) à frente — fora do escopo deste stack.
- **Banco gerenciado:** para usar um Postgres externo, remova o serviço `db`,
  aponte `POSTGRES_HOST`/`POSTGRES_PORT` e mantenha `db_password` como secret.
- **SEI:** default `mock`. A tela `/admin/malote` exibe o aviso de configuração
  até `SEI_PROVIDER=web` com URL/credenciais/secret `sei_senha` (ver stack.env).
