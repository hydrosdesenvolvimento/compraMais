-- Migração 0019 — máquina de estado do Edital (AD-37). Forward-only (AD-28): não altera
-- destrutivamente o que 0007/0016 criaram. Alarga o ciclo de vida de 3 para 6 estados do caminho
-- feliz (`rascunho → aberto → em_analise → em_distribuicao → homologado → em_execucao`) mais o
-- terminal ortogonal `encerrado`. O único dado gravado que muda de nome é `publicado → aberto`
-- (renomeação decidida pelo solicitante em 2026-07-17 para casar com o vocabulário canônico do
-- AD-37); os demais estados são novos e só passam a existir a partir da vitrine/Motor.
--
-- `situacao` é `text` (sem CHECK/enum no banco — a invariante mora no domínio, AD-33), então basta o
-- UPDATE de dados. Idempotente: reexecutar não encontra mais linhas `publicado` e é no-op.

UPDATE editais SET situacao = 'aberto' WHERE situacao = 'publicado';
