# Registro técnico — UC007: Validar Identidade por Prova de Vida (Liveness)

**Data:** 2026-07-09
**Branch:** `feature/uc007-prova-de-vida-liveness`
**Rastreabilidade:** UC007 ([casos-de-uso.md](../../spec/docs/casos-de-uso.md)) · Story 5.6 ([epics.md](../../spec/docs/epics.md)) · RF012 ([prd.md](../../spec/docs/prd.md) v2.5) · RN016 · AD-4/AD-12/AD-18/AD-30 · RIPD ([lgpd/RIPD-prova-de-vida.md](../../spec/docs/lgpd/RIPD-prova-de-vida.md))
**Responsável:** Senior Developer (orquestrado pelo Tech Lead); ratificação do solicitante

## Contexto e divergência ratificada

O UC007 estava marcado como **fora do MVP** na fonte de verdade: biometria facial (RF012) **removida do
MVP**, **Release 2 condicional a RIPD**, com a instrução explícita "**não deve gerar história no MVP**".
A demanda de implementá-lo foi **sinalizada como divergência** (DEC-STR-12) antes de qualquer código; o
solicitante escolheu **"atualizar a spec antes"** — antecipar o UC007 ao MVP **condicional a RIPD**,
registrando a ratificação (2026-07-09) e produzindo o RIPD como gate formal de LGPD.

**Escopo desta entrega:** (1) governança/spec + RIPD; (2) implementação da prova de vida como **gate
desligável por feature flag** (`LIVENESS_ENABLED`, default OFF), preservando o fluxo MVP por Termo de
Aceite (UC004/RN016) quando desligado; (3) frontend com etapa condicional no wizard; (4) validação em
container. **Não** inclui integração com provedor biométrico real (mock com circuit breaker, padrão das
ACLs `receita`/`divida`) — o adaptador real substitui só o `fetchRaw`, e sua ativação é condicionante do
RIPD (aprovação do DPO + contrato/DPA).

## Decisões-chave

- **Feature flag OFF por padrão.** Como o UC007 é condicional a RIPD, o gate só atua com `LIVENESS_ENABLED=true`.
  Desligado: rotas de liveness respondem `409 ProvaDeVidaDesligada` e o gate do Termo é **no-op** — o fluxo
  UC004 e todos os seus testes seguem inalterados (paridade verificada: 241 testes verdes).
- **Provedor mock com circuit breaker + `fail-open + flag` (AD-4/AD-12).** Indisponibilidade do provedor →
  `estado='indisponivel'` + `flag_cpl=true` (covalidação manual de identidade pela CPL), **nunca**
  auto-aprovação silenciosa. Mesma filosofia de RN002.
- **Minimização (RIPD).** Persiste-se **apenas o veredito** (estado, score, provedor, flag, timestamp) — a
  imagem/vídeo nunca trafega para a persistência nem para logs.
- **Gate por porta desacoplada.** O Termo de Aceite ganhou uma porta opcional `GateProvaDeVida`
  (`SolicitarCredenciamento`), com no-op default; o agregado `Credenciamento` **não** foi reescrito.

## Backend (hexagonal, TDD)

| Camada | Artefato | Papel |
|---|---|---|
| Domínio | `credenciamento/domain/prova-de-vida.ts` → `ProvaDeVida` | Veredito de liveness (EntidadeBase/AD-33); `avaliar()` calcula `aprovada`/`reprovada` por limiar e `indisponivel`+`flagCpl` (AD-12); `liberado` (aprovada ou indisponível); snapshot `estado()/deEstado()`. |
| Domínio | `credenciamento/domain/eventos-credenciamento.ts` → `ProvaDeVidaAvaliada` | Evento na trilha (AD-18) sem imagem/vídeo. |
| ACL | `shared/acl/liveness/liveness-gateway.ts` (porta) + `liveness-mock.ts` | Provedor agnóstico com circuit breaker (AD-4); determinístico por `desafio` (Pact-friendly); reporta métricas de adaptador (AD-22). |
| Aplicação | `credenciamento/application/validar-prova-de-vida.ts` → `ValidarProvaDeVida`, `GateProvaDeVidaRepo`, porta `ProvaDeVidaRepository` | Consulta o provedor, traduz o veredito, persiste só o resultado, publica evento; `consultar()` para status; gate real que exige `liberado`. |
| Aplicação | `credenciamento/application/solicitar-credenciamento.ts` | Porta `GateProvaDeVida` + erro `ProvaDeVidaPendente` + no-op default; `aceitarTermo` chama `exigirLiberacao` antes do aceite. |
| Adaptadores | `prova-de-vida-repository-memory.ts` / `prova-de-vida-repository-pg.ts` | Persistência (paridade memory/pg); PG durável, `ultimaDoCredenciamento` por `register_date DESC`. |
| Adaptadores | `prova-de-vida-controller.ts` | `POST/GET /credenciamentos/:id/prova-de-vida`; RBAC fornecedor; `409` quando a flag está desligada. |
| Migração | `migrations/0010_init_prova_de_vida.sql` | Tabela `provas_de_vida` (forward-only, AD-28); índice parcial das provas com `flag_cpl` (fila da CPL). |
| Config | `server.ts` + `.env.example` | `LIVENESS_ENABLED` (default false), `LIVENESS_LIMIAR` (0.8); wiring `pool ? pg : memory`; `metrics` movido para antes do bloco de credenciamento (compartilhado com o ACL de liveness). |

**Testes backend:** `tests/unit/prova-de-vida.spec.ts` (domínio: limiar/aprovada/reprovada/indisponível +
round-trip; caso de uso: mock aprovar/reprovar/indisponível + evento; gate) e
`tests/integration/prova-de-vida-rotas.spec.ts` (flag ligada via `LIVENESS_ENABLED=true`: gate 409 sem
liveness, laço reprovar→aprovar→Termo, indisponibilidade fail-open, trilha, RBAC). O caso "flag desligada"
é coberto por `credenciamento-rotas.spec.ts` (roda sem a flag).

## Frontend

- `pages/publico/Credenciamento.tsx`: wizard refatorado para **passos dinâmicos por chave**; a etapa
  `prova` entra entre Documentos e Termo **apenas** quando `import.meta.env.VITE_LIVENESS_ENABLED === 'true'`
  (lida em render-time). Novo `PassoProvaVida` (captura mock → `api.provaDeVida`; trata aprovada/reprovada/
  indisponível com aviso da flag CPL; `data-cy`: `prova-de-vida`, `iniciar-liveness`, `prova-aprovada`,
  `prova-reprovada`, `prova-indisponivel`). Com a flag desligada, o wizard é **idêntico** ao anterior.
- `lib/api.ts`: `provaDeVida(credId, desafio)` + tipo `ProvaDeVidaResultado`.
- i18n: `credenciamento.passos.prova` + bloco `credenciamento.provaVida.*` nos **três** idiomas (pt-BR/en/es),
  incluindo aviso de privacidade (LGPD/RIPD).
- `Credenciamento.test.tsx`: mantém os testes de flag desligada e adiciona o fluxo com flag ligada
  (`vi.stubEnv`): inserção da etapa, bloqueio do Termo até aprovada, e liberação na indisponibilidade.

## Validação (gate em container — DEC-STR-34)

- **Backend:** `docker compose --profile test run --rm backend-test` → lint + typecheck + build + test:
  **48 arquivos / 241 testes verdes** (+25 vs. base 216).
- **Frontend:** `docker compose --profile test run --rm frontend-test` → lint + typecheck + build + test
  (ver PR/CI).
- **E2E Cypress:** `prova-de-vida` a validar pela QA em execução real (mesma pendência dos UCs anteriores).

## Governança / spec atualizada

- `casos-de-uso.md` (UC007 detalhado + matriz + versão 2.1), `prd.md` (RF012 reativado, v2.5), `epics.md`
  (Story 5.6 + mapeamentos), `plano-releases.md`, `VALIDACAO-MOCKUPS.md` (G5 resolvido),
  `implementation-readiness-report.md`.
- **RIPD** produzido (`spec/docs/lgpd/RIPD-prova-de-vida.md`) — dado biométrico sensível (Art. 11),
  não-retenção da imagem, condicionantes de ativação (DPO, DPA, Procuradoria, texto de consentimento).

## Fronteiras de escopo (explícitas)

- Sem provedor biométrico real: mock determinístico; ativação real é condicionante do RIPD.
- O **consentimento específico** para biometria reusa o `Consentimento` (LGPD) do cadastro; o texto/versão
  do termo biométrico é **condicionante #4 do RIPD** (registro no catálogo ao ativar), não um bloqueio por
  requisição no mock do MVP.
- Cypress E2E fica para a validação da QA (CI).
