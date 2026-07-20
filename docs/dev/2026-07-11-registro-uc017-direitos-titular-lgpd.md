# Registro técnico — UC017 Exercer Direitos do Titular (LGPD)

- **Data:** 2026-07-11
- **Branch:** `feature/uc017-direitos-titular-lgpd`
- **Rastreabilidade:** UC017 (`spec/docs/casos-de-uso.md`) · RF017 · RN015 · RNF007 · Épico 7 (Bloco F) · AD-18 / AD-28 / AD-33
- **Ator:** Titular (o próprio; **não** delegável a Procurador — §V). **Atendente:** `dpo` (Encarregado, Art. 41); `administrador` como fallback.

## Contexto

O módulo `backend/src/titular/` já existia do commit hexagonal em massa (domínio `SolicitacaoTitular` +
`PoliticaRetencao`, caso de uso `GerirDireitosTitular`, `ConsolidarPendencias`, controller com RBAC §V e
eventos já registrados no `AuditConsumer`, testes unit+integração). Como em UC002/003/005/016, faltavam os
mesmos itens recorrentes de fechamento formal.

### Gaps corrigidos

1. **Durabilidade (o gap central).** `SolicitacaoRepositoryMemory` era instanciado direto no `server.ts`
   (sem `pool ? pg : memory`), sem tabela, sem `SolicitacaoRepositoryPg` e sem `estado()/deEstado()` no
   agregado. Era o **último core do Épico 7 só em memória** → o pedido de direito protocolado pelo titular
   **se perdia no restart**, esvaziando a fila do DPO e a pendência LGPD da tela única. Mesma classe dos
   fixes 0004/0007/0009/0010/0013.
2. **Controller sem `recusar`.** A aplicação já expunha `GerirDireitosTitular.recusar` (fluxo passo 2 —
   "atende **ou recusa** com justificativa", RN003), mas não havia endpoint HTTP.
3. **Frontend incompleto.** `PainelTitular` mínimo e fora do nav; sem self-service com a lista dos próprios
   pedidos; sem tela de atendimento do DPO.

## Entrega

### Backend
- `SolicitacaoTitular.estado()/deEstado()` + `SolicitacaoTitularState` (snapshot AD-33).
- Migração **`0014_init_solicitacoes_titular.sql`** (forward-only): tabela `solicitacoes_titular` + índice
  `idx_solic_titular` e índice parcial `idx_solic_pendentes WHERE status='pendente'` (fila do DPO).
- `SolicitacaoRepositoryPg`: upsert idempotente por `id` + `buscarPorExemplo` QBE parametrizado
  (titular/tipo/status, paginação) — mesmo contrato do adaptador em memória.
- Wiring `pool ? new SolicitacaoRepositoryPg(pool) : new SolicitacaoRepositoryMemory()` no `server.ts`
  (tipado pela porta `SolicitacaoRepository`).
- Nova rota `POST /titular/solicitacoes/:id/recusar` (RBAC dpo/admin; motivo obrigatório → 400; 404/409).
  A `GET /titular/solicitacoes` passou a devolver `detalhe`/`categoria` (o DPO age informado).

### Frontend (i18n pt-BR/en/es)
- **Titular:** `Privacidade.tsx` (protocola acesso/correção/exclusão com detalhe + categoria opcionais e
  lista os **seus** pedidos com status) + `PrivacidadeConectada.tsx` (chaveada no `userId` da sessão, pois
  o backend usa o ator como `titularId`). Rota `/privacidade` com guard + item de nav.
- **DPO:** `admin/AtendimentoLgpd.tsx` (fila de pendentes; atender / recusar [motivo obrigatório] /
  descartar [só exclusão, trata 409 = retido]). Rota `/admin/lgpd` + item de nav.
- `api`: `minhasSolicitacoes`, `solicitacoesLgpd`, `atender|recusar|descartarSolicitacao` e
  `solicitarDireito(tipo, detalhe?, categoria?)`.

## Evidências (gates em container — DEC-STR-34)

- **Backend:** `docker compose --profile test run --rm --build backend-test` → **311 testes** verdes
  (+14: round-trip unit `solicitacao-titular` + `titular-rotas.spec.ts` com 11 casos HTTP).
- **Frontend:** `docker compose --profile test run --rm --build frontend-test` → **46 testes** verdes
  (+8: `Privacidade.test.tsx` + `AtendimentoLgpd.test.tsx`).
- **Live contra Postgres real** (`--profile dev`, `RECEITA_PROVIDER=mock`): migração 0014 aplicada;
  protocolo 201; procurador 403 (§V); DPO vê a fila; self-service isola (alheio 403); atender/recusar/
  descartar OK; **retenção FR-008** (fiscal hoje → 409, registro antigo → 200); **durabilidade** (exclusão
  pendente sobrevive ao restart com status/tipo/categoria/detalhe preservados); trilha AD-18
  `DireitoTitularSolicitado x5` / `DireitoTitularAtendido x3`.

## Fora de escopo

- Apagamento/inativação física real dos dados do titular ao "descartar" (aqui a solicitação é resolvida e
  auditada; o efeito nos agregados cadastrais/fiscais/contratuais é incremento seguinte).
- Roteamento por base legal por categoria além do prazo de retenção (§16).
- Notificação ao titular sobre a decisão (gateway de envio — LAC-07).
- Validação E2E Cypress em execução real (QA/CI).
