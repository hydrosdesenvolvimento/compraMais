# Registro Técnico — UC011: Consultar Painel Público de Transparência

- **Data:** 2026-07-10
- **Branch:** `feature/uc011-painel-publico-transparencia` (base `develop`)
- **UC:** UC011 — Consultar Painel Público de Transparência
- **Rastreabilidade:** RF010 · RN013 · RNF006 · Épico 9 (Story 9.2) · AD-3
- **Ator principal:** Cidadão / Gestor Municipal / Representante FIEAC (público, sem login)

## Contexto e decisão de escopo

UC011 pertence ao **Épico 9, Story 9.2** (Should, não bloqueado). O módulo `paineis/` e a página
`Transparencia.tsx` já existiam como esqueleto do commit hexagonal em massa (`8d7b472`), com um contrato
mínimo. A entrega **completa o UC011** sem violar o contrato canônico.

### Divergência resolvida — "montantes por setor" × RN013

O UC011 cita "montantes por setor", mas **RN013 (PRD v2.4)** e o AC refinado da Story 9.2 restringem o
portal a **agregados não-identificáveis** — editais vigentes (contagem), secretarias e segmentos (CNAE) —
**sem** fornecedores, **valores** nem PII. Pela regra de arbitragem do `casos-de-uso.md` (o **PRD
arbitra** divergências), **valores monetários ficam fora do contrato**. Mantido o contrato da RN013.

## Estado prévio (gap)

- `GET /transparencia` retornava `secretarias` como **`secretariaId` cru (UUID interno)** — impróprio
  para um portal público não-identificável.
- **Sem o fluxo alternativo A1** (filtro por período).
- Sem eco do filtro; agregados sem ordenação determinística.
- Testes cobriam só a forma da resposta.

## Entrega

### Backend — `src/paineis/application/paineis.ts`

- `TransparenciaPublica` agora inclui `periodo: { de, ate }` (eco do filtro aplicado). `secretarias`
  passam a ser **siglas legíveis**, ordenadas; `segmentos` ordenados; ambos deduplicados.
- `Transparencia.publico(filtro?: FiltroPeriodo)`: filtro por período **básico** (A1) — datas em
  `YYYY-MM-DD` validadas/normalizadas (`normalizarData`), comparação inclusiva por data
  (`dentroDoPeriodo`); valores malformados são ignorados. Cálculo **sob demanda** (RN013 — sem
  materialização/cache).
- Nova projeção de porta `EditalPublicado { secretaria, cnaesAlvo, referencia }` — **sem IDs internos
  nem PII**; `referencia` = data de registro/publicação do edital (base do recorte por período).

### Backend — rota e wiring

- `paineis-controller.ts`: `GET /transparencia?de&ate` (público, sem auth) repassa o filtro.
- `server.ts`: a fonte resolve `secretariaId → sigla` via `secretariasRepo` (catálogo UC020),
  reordenado para ser instanciado **antes** dos painéis; `editaisPublicados` projeta sigla + CNAEs +
  `registerDate`, com **fallback ao id** se a secretaria tiver sido removida.

### Frontend

- `Transparencia.tsx`: filtro de período (dois `input[type=date]` + **Aplicar/Limpar**) acima dos KPIs;
  `queryKey` inclui o período; agregados extraídos em `TransparenciaAgregados` para manter o filtro
  visível durante o loading. Todas as strings via i18n.
- `lib/api.ts`: `api.transparencia(filtro?)` monta a query-string (`comQuery`) ignorando params vazios;
  tipo `Transparencia` ganha `periodo`.
- i18n **pt-BR/en/es**: `transparencia.filtro*` (Título, De/From/Desde, Até/To/Hasta, Aplicar, Limpar).

## Testes (TDD, container — DEC-STR-34)

- **Unit** `tests/unit/paineis.spec.ts`: dedupe/ordenação, siglas ≠ UUID, filtro inclusivo, datas
  inválidas ignoradas, intervalo vazio → agregados zerados.
- **Integração** `tests/integration/paineis.spec.ts`: fluxo real HTTP — cria secretaria (UC020) →
  cria+publica edital (UC005) → `GET /transparencia` devolve **sigla** (não UUID) e CNAEs; rascunho não
  vaza; `?de&ate` recorta e ecoa o período.
- **Frontend** `Transparencia.test.tsx`: render dos agregados, consulta sem/COM filtro, limpar.
- **E2E** `cypress/e2e/transparencia.cy.ts`: agregados sem login + envio de `de/ate` na consulta.

**Gate:** `backend-test` (lint + typecheck + **305** ✓) · `frontend-test` (lint + typecheck + **34** ✓).

## Pendências / notas

- `referencia` usa `registerDate` (proxy de publicação). Se futuramente o edital ganhar um `publicadoEm`
  explícito, trocar a fonte sem mudar o contrato público.
- Materialização/cache das projeções permanece otimização futura (RN013), sem alterar o contrato.
