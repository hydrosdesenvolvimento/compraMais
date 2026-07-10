# Validação Mockups × Documentação — Compra Mais

**Data:** 2026-07-02
**Fontes analisadas:** [`../AI-UI-Design/painel-administrativo.html`](../AI-UI-Design/painel-administrativo.html) e [`../AI-UI-Design/portal-fornecedor.html`](../AI-UI-Design/portal-fornecedor.html) (SPAs; UI extraída dos bundles).
**Objetivo:** verificar se tudo que os mockups esperam já está coberto na documentação canônica (`spec/docs/`) e **preencher as lacunas**.

> **Método:** os dois arquivos são bundles SPA (~650–870 KB, toda a UI em JS). Extraí os literais de UI (telas, ações "Novo X", campos, colunas, estados, etapas) e cruzei com PRD, épicos, espinha e contrato de UX. Cada gap abaixo foi confirmado com busca nos quatro documentos.

## Resumo

O mockup do **Portal do Fornecedor** está **majoritariamente coberto** — 1 conflito (Prova de vida) e 2 gaps menores (Termo de Aceite, cancelamento). O mockup do **Painel Administrativo** revela **um escopo administrativo bem maior do que a doc descrevia**: além de Editais e Fornecedores (cobertos), ele exige **quatro telas de CRUD** que não existiam como requisito.

| # | Gap / Conflito | Evidência no mockup | Estado na doc (antes) | Correção |
|---|---|---|---|---|
| G1 | **CRUD de Secretarias** | "Nova secretaria" · Nome, Sigla (SEME/SEMSA/…), Responsável | Só ator/relação (AD-16); sem cadastro | **RF020**, AD-16, Story 9.4 |
| G2 | **CRUD de Setores Industriais / catálogo CNAE** | "Novo setor industrial" · Código CNAE, Descrição da atividade | CNAE só como dado da Receita (RF003) | **RF021**, Story 9.5 |
| G3 | **CRUD de Tipos de Documento** | "Novo tipo de arquivo" · Nome, Formato aceito, Validade/Sem validade, Categoria, Exercício | Não encontrado | **RF022**, Story 9.6 |
| G4 | **Gestão de Usuários internos (servidores)** | "Novo usuário" · Nome, E-mail, **Cargo**, nova/confirmar senha | Não encontrado (RF015 é auth do fornecedor) | **RF023**, §15, Story 9.7 |
| G5 | **✅ "Prova de vida" no wizard de credenciamento** | Etapa "Prova de vida" no fluxo do fornecedor | **RF012 reativado no MVP condicional a RIPD** (ratificado 2026-07-09) | **Resolvido** — feature flag OFF + RIPD; ver §Conflito |
| G6 | **Ciclo de vida do Edital** | Estados Rascunho / Aberto / Em Análise / Em Distribuição / Homologado / Em Execução | Sem máquina de estado (AD-14 é do Credenciamento) | **RN014**, **AD-37**, Story 3.4 |
| G7 | **Inativação preservando histórico** | "Registro convertido para Inativo (histórico preservado)" | Não formalizado | **RN015**, **AD-38** |
| G8 | **Termo de Aceite** | Etapa "Termo de Aceite" + tipo de documento | Só consentimento LGPD (RF017/1.5); sem termo formal | **RN016**, Story 5.5 |
| G9 | **Cancelamento de credenciamento pelo fornecedor** | "Credenciamento cancelado." | Só substituição de desistente (CPL, Story 5.4) | **RN016**, AC em Story 5.3 |
| G10 | **Taxonomia de cargos mais rica** | Administrador, Gestor, Analista CPL, Auditor, Coordenador, Controladoria, Secretário | §15 tinha papéis, não os cargos operacionais | **§15 refinado**, AD-35 |

## Conflito G5 — "Prova de vida" (biometria) × MVP

O wizard de credenciamento do mockup inclui a etapa **"Prova de vida"** (liveness). O PRD **removeu biometria do MVP** (RF012 — condicional Release 2, somente com RIPD aprovado; risco de escopo explicitamente mitigado em §12).

**Decisão anterior (conservadora):** manter a decisão do PRD — "Prova de vida" NÃO entra no MVP; a conclusão usa **Termo de Aceite** (G8/RN016) e a liveness fica em Release 2 condicional a RIPD.

**✅ RATIFICADO (2026-07-09):** o solicitante **reabriu o RF012/UC007 para o MVP condicional a RIPD**. A etapa "Prova de vida" do mockup passa a ser **requisito de MVP**, porém:
- entra **desligada por feature flag** (`LIVENESS_ENABLED`, default OFF), preservando o fluxo por Termo de Aceite enquanto o RIPD não for operacionalizado;
- quando ligada, é **pré-requisito do Termo de Aceite** (UC007);
- o **RIPD** foi produzido como gate formal de LGPD ([lgpd/RIPD-prova-de-vida.md](lgpd/RIPD-prova-de-vida.md)) — tratamento de dado biométrico sensível (Art. 11), imagem/vídeo **não retidos**;
- indisponibilidade do provedor = `fail-open + flag` para a CPL (AD-12).

Rastreável em UC007 ([casos-de-uso.md](casos-de-uso.md)), RF012 ([prd.md](prd.md) v2.5) e Story 5.6 ([epics.md](epics.md)). Conflito G5 **resolvido**.

## Cobertura confirmada (sem ação)

- **Fornecedor:** vitrine por CNAE com prazo/"Encerra em" e filtro por secretaria (E3); Meus Credenciamentos com fase/situação (E5); rateio/cota/teto/aptos (E5); Documentos com upload e tipos (E2); Minha conta read-only + sincronizar (RF018/RN009).
- **Admin:** criação de Editais (E3) e Fornecedores (E1); homologação de Distribuição (E5); geração de Malote SEI (E6); consulta/exportação de Auditoria (E8); aprovar/reprovar Documento (E2).

## Onde cada gap foi corrigido

- **PRD** ([prd.md](prd.md)) v2.4 — RF020–RF023, RN014–RN016, §15 (cargos), nota de reconciliação G5.
- **Espinha** ([ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md)) — AD-37 (ciclo do Edital), AD-38 (inativação preservando histórico), AD-35 (cargos), AD-16 (Secretaria como entidade gerida).
- **Épicos** ([epics.md](epics.md)) — seção "Cobertura dos Mockups": Stories 3.4, 5.5, 9.4, 9.5, 9.6, 9.7 + ACs em 5.3.
- **UX** ([EXPERIENCE.md](ux/EXPERIENCE.md)) — telas do Painel Admin detalhadas + etapas do wizard de credenciamento.

## Segunda passada — validação profunda (2026-07-02)

Reexecução com extração das **chaves de dado, máquinas de estado e fluxos** dos bundles (não só rótulos de UI), cruzada contra a doc **já corrigida**. Resultado: **os 10 gaps acima são a cobertura completa** — nenhum gap estrutural novo. Confirmações relevantes:

- Estados batem com a doc: Edital (`Rascunho/Aberto/Em Análise/Em Distribuição/Homologado/Em Execução` — RN014); fase do fornecedor (`Requerente/Credenciado/Fornecedor/Reserva` — AD-14); `Ativa/Inativa/Bloqueado` (RN015).
- `facialChecking` / `facialDone` **confirmam** que "Prova de vida" é liveness facial → reforça o conflito **G5** (mantido para ratificação).
- `termoAceito`, `reuse`, `idoneo`, `Cadastro de Reserva · 2ª Demanda` → todos com destino já documentado.

**Micro-ajuste (único residual):** o Admin expõe `senhaAtual` + `novaSenha` + `confirmSenha` → **troca da própria senha pelo usuário autenticado** (distinta do reset por esquecimento e do reset administrativo). Incorporada ao **RF015**.

---
*Validação produzida em 2026-07-02 (com segunda passada profunda na mesma data). Complementa a [convergência](CONVERGENCIA.md).*
