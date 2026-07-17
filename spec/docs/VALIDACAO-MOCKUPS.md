# Validação Mockups × Documentação — Compra Mais

**Data:** 2026-07-02
**Fontes analisadas:** [`../Prototipo/painel-administrativo.html`](../Prototipo/painel-administrativo.html) e [`../Prototipo/portal-fornecedor.html`](../Prototipo/portal-fornecedor.html) (SPAs; UI extraída dos bundles). *Endereço atualizado em 2026-07-16 (AD-39): os bundles vinham de `spec/AI-UI-Design/`, removido; os arquivos analisados são byte-idênticos aos atuais.*
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
| G5 | **⚠️ "Prova de vida" no wizard de credenciamento** | Etapa "Prova de vida" no fluxo do fornecedor | **Biometria REMOVIDA do MVP** (RF012, R2 condicional) | **Divergência a ratificar** — ver §Conflito |
| G6 | **Ciclo de vida do Edital** | Estados Rascunho / Aberto / Em Análise / Em Distribuição / Homologado / Em Execução | Sem máquina de estado (AD-14 é do Credenciamento) | **RN014**, **AD-37**, Story 3.4 |
| G7 | **Inativação preservando histórico** | "Registro convertido para Inativo (histórico preservado)" | Não formalizado | **RN015**, **AD-38** |
| G8 | **Termo de Aceite** | Etapa "Termo de Aceite" + tipo de documento | Só consentimento LGPD (RF017/1.5); sem termo formal | **RN016**, Story 5.5 |
| G9 | **Cancelamento de credenciamento pelo fornecedor** | "Credenciamento cancelado." | Só substituição de desistente (CPL, Story 5.4) | **RN016**, AC em Story 5.3 |
| G10 | **Taxonomia de cargos mais rica** | Administrador, Gestor, Analista CPL, Auditor, Coordenador, Controladoria, Secretário | §15 tinha papéis, não os cargos operacionais | **§15 refinado**, AD-35 |

## Conflito G5 — "Prova de vida" (biometria) × MVP

O wizard de credenciamento do mockup inclui a etapa **"Prova de vida"** (liveness). O PRD **removeu biometria do MVP** (RF012 — condicional Release 2, somente com RIPD aprovado; risco de escopo explicitamente mitigado em §12).

**Decisão adotada (conservadora, a ratificar):** manter a decisão do PRD — **"Prova de vida" NÃO entra no MVP**. No MVP a conclusão do credenciamento usa **Termo de Aceite** (G8/RN016); a etapa de liveness é **Release 2 condicional a RIPD**. O mockup é um alvo de UI futuro nesse ponto, não requisito de MVP.

> 🔴 **Ratificar com o solicitante:** se "Prova de vida" for MVP, reabrir RF012 exige RIPD aprovado (gate LGPD LAC-09) e revisão de risco — não é troca de parâmetro. Enquanto não ratificado, vale a decisão conservadora acima.

## Cobertura confirmada (sem ação)

- **Fornecedor:** vitrine por CNAE com prazo/"Encerra em" e filtro por secretaria (E3); Meus Credenciamentos com fase/situação (E5); rateio/cota/teto/aptos (E5); Documentos com upload e tipos (E2); Minha conta read-only + sincronizar (RF018/RN009).
- **Admin:** criação de Editais (E3) e Fornecedores (E1); homologação de Distribuição (E5); geração de Malote SEI (E6); consulta/exportação de Auditoria (E8); aprovar/reprovar Documento (E2).

## Onde cada gap foi corrigido

- **PRD** ([prd.md](prd.md)) v2.4 — RF020–RF023, RN014–RN016, §15 (cargos), nota de reconciliação G5.
- **Espinha** ([ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md)) — AD-37 (ciclo do Edital), AD-38 (inativação preservando histórico), AD-35 (cargos), AD-16 (Secretaria como entidade gerida).
- **Épicos** ([epics.md](epics.md)) — seção "Cobertura dos Mockups": Stories 3.4, 5.5, 9.4, 9.5, 9.6, 9.7 + ACs em 5.3.
- **UX** (bundles de [`../Prototipo/`](../Prototipo/)) — telas do Painel Admin detalhadas + etapas do wizard de credenciamento.

## Segunda passada — validação profunda (2026-07-02)

Reexecução com extração das **chaves de dado, máquinas de estado e fluxos** dos bundles (não só rótulos de UI), cruzada contra a doc **já corrigida**. Resultado: **os 10 gaps acima são a cobertura completa** — nenhum gap estrutural novo. Confirmações relevantes:

- Estados batem com a doc: Edital (`Rascunho/Aberto/Em Análise/Em Distribuição/Homologado/Em Execução` — RN014); fase do fornecedor (`Requerente/Credenciado/Fornecedor/Reserva` — AD-14); `Ativa/Inativa/Bloqueado` (RN015).
- `facialChecking` / `facialDone` **confirmam** que "Prova de vida" é liveness facial → reforça o conflito **G5** (mantido para ratificação).
- `termoAceito`, `reuse`, `idoneo`, `Cadastro de Reserva · 2ª Demanda` → todos com destino já documentado.

**Micro-ajuste (único residual):** o Admin expõe `senhaAtual` + `novaSenha` + `confirmSenha` → **troca da própria senha pelo usuário autenticado** (distinta do reset por esquecimento e do reset administrativo). Incorporada ao **RF015**.

---
*Validação produzida em 2026-07-02 (com segunda passada profunda na mesma data). Complementa a [convergência](CONVERGENCIA.md).*
