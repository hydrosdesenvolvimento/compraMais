# Compra Mais — Pacote de Documentação para a Equipe de Desenvolvimento

**Projeto:** Compra Mais (Programa de Compras Municipalizadas — Prefeitura de Rio Branco)
**Snapshot canônico:** 2026-07-05 (Validação 01 do cliente)
**Fonte de verdade:** **este diretório (`spec/docs/`), versionado no git.**

> **Convergência 2026-07-02:** o projeto mantinha três linhagens de documentação
> concorrentes — este pacote BMad (`spec/docs/`), oito features estilo Spec-Kit
> (`spec/00X-*`) e artefatos em `_bmad-output/` (fora do git). A partir desta data
> **`spec/docs/` é a única fonte de verdade**; o Spec-Kit foi arquivado em
> [`../archive/2026-06-29-spec-kit/`](../archive/2026-06-29-spec-kit/) após o resgate das
> suas decisões finas; `_bmad-output/` deixa de ser referenciado como canônico.
> Detalhes, rastreabilidade e regras da operação: [CONVERGENCIA.md](CONVERGENCIA.md).

## Documentos canônicos (versionados)

| Documento | Para quê |
|---|---|
| [prd.md](prd.md) | Requisitos (RF001–RF026, RNF001–RNF008, RN001–RN021), papéis (RBAC), catálogo de parâmetros, escopo, métricas — **v2.5** |
| [architecture/ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md) | Espinha de arquitetura: **41 ADs** (invariantes), stack, diagramas, conventions |
| [ux/DESIGN.md](ux/DESIGN.md) | Identidade visual e tokens (Poppins, azul-700 #0061AE, acessibilidade) |
| [ux/EXPERIENCE.md](ux/EXPERIENCE.md) | IA de navegação, telas (incl. Admin e Público), estados, jornadas |
| [casos-de-uso.md](casos-de-uso.md) | **23 casos de uso (UC001–UC023)** — ator → objetivo → fluxo, rastreados a RF/RN/AD; alinhado ao **PRD v2.5** (UC ≠ critério de aceite: o teste vive em epics.md) |
| [epics.md](epics.md) | **9 épicos / 31 histórias + cobertura de mockups e da Validação 01** com critérios de aceite (Given/When/Then) — **é a fila de histórias canônica** |
| [plano-releases.md](plano-releases.md) | Sequenciamento em 3 ondas + 4 gates |
| [matriz-lacunas.md](matriz-lacunas.md) | Lacunas catalogadas e suas resoluções |
| [implementation-readiness-report.md](implementation-readiness-report.md) | Avaliação de prontidão: PRONTO COM RESSALVAS |
| [CONVERGENCIA.md](CONVERGENCIA.md) | **Registro da convergência 2026-07-02** — regras, resgate das 13 decisões, rastreabilidade |
| [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md) | **Validação mockups × doc (2026-07-02)** — 10 gaps do Painel Admin/wizard e suas correções |
| [VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md) | **Incorporação da Validação 01 do cliente (2026-07-05)** — feedback das visitas 5/6, mapa Validação 01 → ID global, decisões e lacunas |

## Referências de UI

- **Contrato de UX:** [ux/DESIGN.md](ux/DESIGN.md) + [ux/EXPERIENCE.md](ux/EXPERIENCE.md).
- **Mockups ratificados (HTML):** [`../AI-UI-Design/`](../AI-UI-Design/) — Portal do Fornecedor
  ([portal-fornecedor.html](../AI-UI-Design/portal-fornecedor.html)) e **Painel Administrativo**
  ([painel-administrativo.html](../AI-UI-Design/painel-administrativo.html)). O **Painel Admin** ganhou mockup
  ratificado — **UX-DR10 fecha na metade Admin**; o **Portal Público** ainda deriva (ver EXPERIENCE.md).

## Fila de histórias (canônica, em git)

A fila de trabalho é [epics.md](epics.md): 9 épicos, 31 histórias com AC em Given/When/Then,
rastreadas a RF/RN/AD. **Não há mais fila em `_bmad-output/`** (aqueles diretórios estão vazios e
fora do git — não usar). O sequenciamento de sprint segue [plano-releases.md](plano-releases.md).

## Como começar (ciclo de história)

1. `bmad-create-story` → próxima história a partir de [epics.md](epics.md) (começar pela **1.1 scaffold**).
2. `bmad-dev-story` → implementa (TDD) → `review`.
3. `bmad-code-review` → `done`.

## ⚠️ Pendências que a equipe precisa observar

- 🔒 **Épico 5 (Motor)** bloqueado até a ratificação de **Item × Lote** (SMGA/TCE). Não iniciar suas histórias antes disso.
- ⚖️ Parâmetros a ratificar (isolados como config, não bloqueiam o início amplo): default do desempate do motor, política de indisponibilidade de API, retenção LGPD por categoria, limite em MB do SEI (`SEI_MALOTE_LIMITE_MB`), teto de export de auditoria. Ver catálogo no [prd.md](prd.md) §16.
- 🎨 Decisões de UI: **LAYOUT A vs B** do login e **cor azul oficial** (brandbook) — ratificar antes do polimento de frontend.
- ⚖️ **LAC-22** (Validação 01): texto jurídico do **Termo de Responsabilidade** (RF024) pendente de validação do jurídico da Prefeitura — **bloqueia a Story 2.4** no desenvolvimento (não bloqueia o canônico). Dono: SMGA/Jurídico.
- 🔁 **LAC-23** (Validação 01): definir os **critérios exatos de convocação do Cadastro de Reserva** ("apenas em caso de falha do titular?") — refina RN004/UC009. Dono: SMGA/CPL.
- 📄 **LAC-24** (Validação 01): PDF do SEI — decidir se o sistema apenas **armazena** o PDF ou **extrai** dados (OCR/parse); risco de *scope creep* se for extração (impacta RF025/AD-39). Dono: TI/SMGA.
- ✅ **Conflito G5 (biometria)** — **FECHADO** pela ratificação do cliente na Validação 01.

---
*Snapshot canônico atualizado em 2026-07-05 pela incorporação da Validação 01 do cliente ([VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md)), sobre a base consolidada em 2026-07-02 pela operação de convergência ([CONVERGENCIA.md](CONVERGENCIA.md)). Este diretório é versionado; é a fonte de verdade do projeto.*
