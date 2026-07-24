-- Migração 0028 — credenciamento: coluna `prova_vida` (UC007 — prova de vida facial). Forward-only
-- (AD-28). Persiste o veredito da verificação facial do passo 3 do wizard (Capacidade → Documentos →
-- Prova de Vida → Termo → Concluído), espelhando o `termo` (0008): jsonb com
-- { status: 'aprovada'|'reprovada'|'manual', score, modelo, verificadoEm, tentativas }.
--
-- O agregado gateia o Termo (0008): `aceitarTermo` exige `prova_vida.status` aprovada/manual. Linhas
-- anteriores ficam com `prova_vida = NULL` (credenciamentos já `aceito` antes do UC007 permanecem
-- válidos — o gate só se aplica a novos aceites). `passo_atual` (0024) passa a ir até 5 (Concluído);
-- não há CHECK a alterar. `manual` = liberação pela CPL após reprovações (fallback D6).
ALTER TABLE credenciamentos ADD COLUMN IF NOT EXISTS prova_vida jsonb;
