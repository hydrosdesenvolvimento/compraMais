-- Migração 0015 — visibilidade de TELAS do Painel Admin por PAPEL RBAC (§15/AD-35). Forward-only (AD-28):
-- NUNCA alterar destrutivamente após aplicada. Persiste a "Administração de telas por perfil": QUAIS telas
-- do Painel Admin cada papel interno enxerga. Só papéis CUSTOMIZADOS pelo Administrador têm linhas aqui;
-- papéis ausentes caem na matriz padrão do código (derivada dos UCs). Um papel customizado grava uma linha
-- por tela do catálogo com `visivel` (true/false), para distinguir "customizado zerado" de "usa o padrão".
-- O papel `administrador` é superusuário (vê tudo, fora desta tabela). A alteração entra na trilha
-- append-only (AD-18) via VisibilidadeTelasAlterada; `last_user_update` é auditoria de linha (AD-33).

CREATE TABLE IF NOT EXISTS perfil_tela_visibilidade (
  papel             text NOT NULL,
  tela_key          text NOT NULL,
  visivel           boolean NOT NULL DEFAULT true,
  update_date       timestamptz NOT NULL DEFAULT now(),
  last_user_update  text NOT NULL,
  PRIMARY KEY (papel, tela_key)
);

-- Consulta quente: telas visíveis de um papel (menu + guardas de rota do frontend).
CREATE INDEX IF NOT EXISTS idx_perfil_tela_papel ON perfil_tela_visibilidade (papel);
