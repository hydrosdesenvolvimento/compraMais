-- Migração 0005 — identidade: contas_acesso (UC019 / AD-30). Forward-only (AD-28): NUNCA alterar
-- destrutivamente após aplicada. Persiste o agregado ContaAcesso (titular + procuradores) para que os
-- vínculos Procurador↔empresa sobrevivam a reinícios — antes o repositório era só em memória, deixando
-- o titular (persistido em `usuarios`) sem seus procuradores após restart (mesma classe do fix de 0004).
--
-- `id` = mesmo id do usuário de login (JWT `x-user-id`) no caso do titular, garantindo que as rotas de
-- procuradores resolvam o titular pelo ator autenticado. Remoção é LÓGICA (`ativo = false`, RN015): o
-- vínculo e o rastro do procurador removido são preservados (append-only), nunca deletados.

CREATE TABLE IF NOT EXISTS contas_acesso (
  id                text PRIMARY KEY,
  fornecedor_id     text NOT NULL,
  papel             text NOT NULL,
  identificador     text NOT NULL,
  convidado_por     text,
  ativo             boolean NOT NULL DEFAULT true,
  register_date     timestamptz NOT NULL DEFAULT now(),
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contas_fornecedor ON contas_acesso (fornecedor_id);
