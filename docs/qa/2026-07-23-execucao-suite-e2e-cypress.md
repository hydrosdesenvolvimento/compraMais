# Execução da Suíte E2E (Cypress) e Achados — 2026-07-23

- **Responsável:** UX Expert (orquestrando), com arbitragem do Tech Lead
- **Ambiente:** `docker compose --profile dev` (Postgres real, `RECEITA_PROVIDER=mock`), seed aplicado
- **Escopo:** primeira execução real da suíte E2E do projeto + migração das grades de formulário ao Design System

---

## 1. Resumo executivo

A suíte E2E do compraMais **nunca havia sido executada** — a pendência "E2E Cypress a validar (QA/CI)" estava aberta desde 2026-07-01, repetida em toda entrega desde então. Executada pela primeira vez, revelou dois blocos de achados:

| Bloco | Antes | Depois |
|---|---|---|
| Specs funcionais (10 pré-existentes + 1 novo) | 30/38 passando — **9 falhas** | **38/38 passando** |
| Auditoria de acessibilidade (`acessibilidade.cy.ts`) | não executável | **13/13 falhando — violações WCAG reais** |

**Causa raiz única das 9 falhas funcionais:** os specs foram escritos **antes do AD-20** (identidade por JWT, 2026-07-17) e nunca autenticavam. Enquanto o RBAC era header de texto e as rotas eram abertas, visitar uma tela sem sessão era neutro; depois do AD-20 as rotas protegidas redirecionam ao `/cadastro` e as chamadas respondem 401. Como a suíte nunca rodava, nada ficou vermelho e a defasagem passou despercebida por seis semanas.

**A auditoria de acessibilidade era um falso negativo estrutural:** as 11 rotas eram visitadas sem sessão, então todas redirecionavam ao `/cadastro` — as onze auditorias avaliavam **a mesma tela de login**, e por isso reportavam resultado idêntico.

---

## 2. Como executar a suíte

O container `frontend` não tem `Xvfb`, e a imagem oficial `cypress/included` não enxerga o `node_modules` do projeto. A combinação que funciona monta o **volume de node_modules do compose** — assim a imagem usa o `cypress.config.ts` real e resolve `cypress-axe`:

```bash
docker compose --profile dev up -d          # stack no ar
docker compose exec -T backend npm run seed # usuários dos specs

cd frontend && docker run --rm --network host \
  -v "$PWD":/e2e -v compramais_frontend_node_modules:/e2e/node_modules -w /e2e \
  -e CYPRESS_BASE_URL=http://localhost:5173 \
  cypress/included:14.5.4 --e2e --browser electron
```

`--network host` é necessário: com a rede do compose, o dev server do Vite responde **403** (verificação de Host).

---

## 3. Achados funcionais e tratamento

| Spec | Falhas | Causa | Tratamento |
|---|---|---|---|
| `contestacao.cy.ts` | 3/3 | Rota protegida; sem sessão o guard manda ao `/cadastro` | Login real como titular |
| `covalidacao.cy.ts` | 2/2 | Fila não stubada + rota protegida; **e o 2º caso afirmava contrato obsoleto** | Ver §3.1 |
| `vitrine.cy.ts` | 1/2 | A vitrine resolve o fornecedor pelo token → 401 → lista vazia; `each` sobre zero elementos passaria vazio | Login real + stub explícito da vitrine |
| `editais.cy.ts` | 1/2 | `GET /gestao/editais` responde **envelope paginado** `{ items, total }`; o stub devolvia array cru → `.items` indefinido | Stub corrigido ao contrato + login |
| `senha.cy.ts` | 1/7 | Token de fachada `'jwt.mock'`: o `GET /auth/perfil` após a troca voltava 401 e o tratador global navegava ao login, desmontando a confirmação | Login real |
| `acessibilidade.cy.ts` | 12 (não executável) | `cypress-axe` irresolvível sem o `node_modules` do projeto | Runner corrigido (§2) + sessão por rota |

Infraestrutura comum: novo `frontend/cypress/support/sessao.ts` com `visitarComo(perfil, rota)` — login real contra o backend, o mesmo caminho do usuário.

### 3.1 Contrato obsoleto em `covalidacao.cy.ts` (decisão explícita)

O caso "exige justificativa ao reprovar" afirmava: clicar em **Reprovar sem motivo** e esperar **422 do backend**. A tela hoje **impede a submissão** — o botão fica desabilitado enquanto não há justificativa (RF004/RN003). O erro observado foi literalmente `cy.click() failed because this element is disabled`.

Manter a asserção original exigiria **piorar a UI** para satisfazer um teste. O caso foi reescrito para verificar a guarda do cliente (botão desabilitado → habilita ao preencher → envia com a justificativa). A proteção do servidor continua coberta pelos testes de integração do backend.

> Mesmo critério já aplicado pelo Tech Lead em 2026-07-17 no `rbac-auditoria.spec.ts`: teste que afirma o comportamento antigo é **atualizado**, não apagado, e a intenção é preservada.

---

## 4. Achados de acessibilidade (WCAG 2.1 AA / e-MAG / RNF006 / INF-003)

Inventário sobre as telas **reais**, por perfil:

| Regra | Impacto | Alcance | Alvos |
|---|---|---|---|
| `color-contrast` | serious | **9 de 9 rotas** | `.cm-brand-sub` (2.55:1), `.cm-grouplabel` (2.55:1), `.cm-ver` (1.52:1), `button[data-cy="aba-criar"]` (4.38:1) e textos de apoio. Até **75 nós** numa única rota (`/admin/auditoria`) |
| `aria-required-children` | **critical** | `/cadastro`, `/admin/catalogos` | `role="tablist"` com filhos `<button>` sem `role="tab"` |
| `aria-allowed-attr` | **critical** | `/admin/catalogos` | `aria-selected` em elemento sem `role="tab"` |
| `label` | **critical** | `/admin/auditoria` | `input[data-cy="de"]` e `input[data-cy="ate"]` sem rótulo associado |
| `select-name` | **critical** | `/titular` | `select[data-cy="tipo-direito"]` sem nome acessível |

### Corrigido nesta entrega

`aria-required-children` + `aria-allowed-attr` em `/admin/catalogos` — `role="tab"` nos botões das abas. É a tela construída nesta sessão; confirmado por reexecução: das 3 violações restaram apenas as de contraste, herdadas do shell.

### Não corrigido — requer decisão (recomendação do UX Expert)

1. **`color-contrast` (9 rotas).** Os valores reprovados (#9aa3ae, #cbd2da, #6b7280 sobre claro) são **tokens de cinza do Design System**, não erros pontuais de tela. Alterá-los repinta o produto inteiro e **colide com a divergência D1 já aberta** (paleta navy implementada × contrato antigo, pendente de ratificação com o brandbook da Prefeitura). Recomendo tratar como um incremento próprio de UX, junto da resolução de D1, escurecendo a escala de cinza até ≥4.5:1 (texto normal) e ≥3:1 (texto grande).
2. **`label` em `/admin/auditoria` e `select-name` em `/titular`.** Correções pontuais e de baixo risco (associar `<label for>` / `aria-label`), mas em telas fora do escopo desta demanda.

Enquanto (1) não for decidido, `acessibilidade.cy.ts` permanece vermelho — **estado honesto**: o produto tem as violações que o spec acusa. Recomendo **não** relaxar `includedImpacts` para pintá-lo de verde.

---

## 5. Migração das grades de formulário ao Design System

Motivação: 10 grades `gridTemplateColumns: '1fr 1fr'` inline em 7 telas admin, nenhuma responsiva.

Migradas para `.cm-form-grid` (criada nesta sessão): `GerirUsuarios` (2), `GerirEditais` (2), `TiposArquivos` (2, uma condicional), `Secretarias`, `GerarMalote`, `ModalFornecedor`, `SetoresIndustriais`.

Para que a migração fosse **neutra na aparência**, o `gap` de `.cm-form-grid` foi uniformizado em `16px` (era `16px 20px`) — igual ao das grades inline substituídas. O único efeito visível é o ganho pretendido: **colapso para coluna única em ≤920px**, que essas telas não tinham.

`AuthPanel.tsx` ficou **de fora deliberadamente**: usa `gap: 13` (ritmo próprio da tela de autenticação) e vive num painel estreito, onde o colapso por largura de *viewport* é o sinal errado — o certo ali seria container query.

---

## 6. Estado final

- Gate no container: frontend **183** testes (lint + typecheck + test), 0 erros
- E2E: **38/38** funcionais verdes em 10 specs; `acessibilidade.cy.ts` 13/13 vermelho por violações reais
- Ambiente derrubado ao fim da execução

## 7. Rastreabilidade

- Log do prompt: [`docs/prompts/2026-07-23_003_ajustar-disposicao-campos-catalogos.md`](../prompts/2026-07-23_003_ajustar-disposicao-campos-catalogos.md)
- Registro da entrega anterior: [`docs/dev/2026-07-23-registro-catalogo-materiais-servicos.md`](../dev/2026-07-23-registro-catalogo-materiais-servicos.md)
- Design System: [`docs/ux/design-system.md`](../ux/design-system.md) — atualizar com `.cm-form-grid`/`.cm-campo-total` e com o débito de contraste
