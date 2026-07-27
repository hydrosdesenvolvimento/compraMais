-- Migração 0039 — fornecedores: marca de anonimização LGPD (RF-LGPD / UC017 / FR-004).
-- Forward-only (AD-28): NUNCA alterar destrutivamente após aplicada.
--
-- Atender a um pedido de exclusão do titular (LGPD art. 18, V) sobre um fornecedor que JÁ PARTICIPOU de
-- editais não pode significar apagar a linha: credenciamentos, distribuições e malotes apontam para ela,
-- e o ato administrativo publicado precisa continuar dizendo quem foi credenciado. A saída é anonimizar —
-- apagar o dado pessoal e preservar o registro da participação.
--
-- Esta coluna registra QUANDO isso aconteceu. Sem ela não há como distinguir, olhando a base, um
-- fornecedor que simplesmente nunca informou telefone/endereço de um cujo contato foi ELIMINADO a pedido:
--   - a tela precisa marcar o cadastro como anonimizado (e não oferecer "editar contato" nele);
--   - a prestação de contas ao titular precisa da data em que o direito foi exercido;
--   - uma nova solicitação sobre o mesmo fornecedor precisa saber que já foi atendida.
--
-- NULL = fornecedor normal. Preenchida = dado pessoal eliminado; CNPJ e razão social permanecem, por
-- serem dados de pessoa jurídica que integram o ato administrativo (decisão do solicitante, 2026-07-26).
--
-- Idempotente (IF NOT EXISTS) e não destrutiva: nenhuma linha existente é alterada.
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS anonimizado_em timestamptz;

-- Índice parcial: a fatia anonimizada é pequena e consultada por relatório de LGPD/prestação de contas.
-- Parcial (e não total) para não indexar os NULLs, que são a maioria absoluta das linhas.
CREATE INDEX IF NOT EXISTS idx_fornecedores_anonimizados
  ON fornecedores (anonimizado_em) WHERE anonimizado_em IS NOT NULL;
