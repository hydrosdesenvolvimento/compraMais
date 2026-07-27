#!/usr/bin/env bash
# Executa `seed-cnae-brasil.sql` DENTRO do container do banco (PRJ-DEC-05: nada roda no host).
#
# Uso:
#   backend/scripts/seed-cnae-brasil.sh                 # dev (docker compose --profile dev, serviço `db`)
#   DB_CONTAINER=compramais_db backend/scripts/seed-cnae-brasil.sh   # prod/Swarm (docker exec direto)
#
# Variáveis opcionais: POSTGRES_USER (default compramais), POSTGRES_DB (default compramais),
# COMPOSE_PROFILE (default dev), DB_SERVICE (default db). Nenhuma senha é lida ou impressa: a conexão
# usa o socket local do container (peer/trust interno do Postgres), como nos demais utilitários.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SQL="$RAIZ/backend/scripts/seed-cnae-brasil.sql"
PGUSER_="${POSTGRES_USER:-compramais}"
PGDB_="${POSTGRES_DB:-compramais}"

[[ -f "$SQL" ]] || { echo "[seed-cnae] arquivo não encontrado: $SQL" >&2; exit 1; }

if [[ -n "${DB_CONTAINER:-}" ]]; then
  echo "[seed-cnae] aplicando em docker exec ${DB_CONTAINER} (db=${PGDB_}, user=${PGUSER_})"
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$PGUSER_" -d "$PGDB_" < "$SQL"
else
  PERFIL="${COMPOSE_PROFILE:-dev}"
  SERVICO="${DB_SERVICE:-db}"
  echo "[seed-cnae] aplicando em docker compose --profile ${PERFIL} exec ${SERVICO} (db=${PGDB_}, user=${PGUSER_})"
  docker compose --profile "$PERFIL" exec -T "$SERVICO" \
    psql -v ON_ERROR_STOP=1 -U "$PGUSER_" -d "$PGDB_" < "$SQL"
fi

echo "[seed-cnae] concluído."
