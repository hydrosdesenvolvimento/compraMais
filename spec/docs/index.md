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
| [prd.md](prd.md) | Requisitos (RF001–RF023, RNF001–RNF008, RN001–RN016), papéis (RBAC), catálogo de parâmetros, escopo, métricas — **v2.4** |
| [architecture/ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md) | Espinha de arquitetura: **39 ADs** (invariantes), stack, diagramas, conventions |
| [ux/DESIGN.md](ux/DESIGN.md) | **Contrato de UX (escrito)** — tokens, componentes, acessibilidade, marca. ⚠️ paleta **em arbitragem** (0.7) |
| [ux/EXPERIENCE.md](ux/EXPERIENCE.md) | **Contrato de UX (escrito)** — IA de navegação, telas (incl. Admin e Público), estados, jornadas |
| [`../Prototipo/`](../Prototipo/) | **Contrato de UX (artefato)** — os 3 bundles HTML: layout e comportamento normativos |
| [`../Brandbook/`](../Brandbook/) | **Identidade oficial da Prefeitura de Rio Branco** — azul institucional `#0061AE`/`#003A68`. Diverge da navy implementada (D1 → arbitragem 0.7) |
| [casos-de-uso.md](casos-de-uso.md) | **21 casos de uso (UC001–UC021)** — ator → objetivo → fluxo, rastreados a RF/RN/AD; alinhado ao **PRD v2.4** (UC ≠ critério de aceite: o teste vive em epics.md) |
| [epics.md](epics.md) | **9 épicos / 31 histórias** com critérios de aceite (Given/When/Then) — **é a fila de histórias canônica** |
| [plano-releases.md](plano-releases.md) | Sequenciamento em 3 ondas + 4 gates |
| [matriz-lacunas.md](matriz-lacunas.md) | Lacunas catalogadas e suas resoluções |
| [implementation-readiness-report.md](implementation-readiness-report.md) | ⚠️ **OBSOLETO (2026-07-16)** — avaliou PRD v2.2 / 33 AD / 18 RF; a realidade é v2.4 / 39 AD / 23 RF. Mantido como registro histórico; **não citar como prontidão atual** |
| [**ARBITRAGEM-01.md**](ARBITRAGEM-01.md) | ⬛ **RESPONDIDA pela Prefeitura em 2026-07-16.** Fechadas: 1B (azul oficial `#0061AE`) · 2B (contrato = conjunto validado) · 3B (renumerar o técnico) · 4A (prova de vida fora) · **7A (item — Épico 5 destravado)**. 🟡 **5B e 6B são posição do cliente, pendentes de parecer** (Procuradoria / encarregado a designar). Consequências e parecer contrário registrados no documento |
| [CONVERGENCIA.md](CONVERGENCIA.md) | **Registro da convergência 2026-07-02** — regras, resgate das 13 decisões, rastreabilidade |
| [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md) | **Validação mockups × doc (2026-07-02)** — 10 gaps do Painel Admin/wizard e suas correções |
| [VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md) | **Incorporação da Validação 01 do cliente (2026-07-05)** — feedback das visitas 5/6, mapa Validação 01 → ID global, decisões e lacunas |

## Referências de UI

O contrato de UX tem **duas metades, ambas normativas** (fronteira explícita, AD-39):

| Metade | Onde | O que obriga |
|---|---|---|
| **Escrita** | [ux/DESIGN.md](ux/DESIGN.md) + [ux/EXPERIENCE.md](ux/EXPERIENCE.md) | Tokens, componentes, acessibilidade, marca; IA de navegação, telas, estados, jornadas |
| **Artefato** | [`../Prototipo/`](../Prototipo/) | Layout e comportamento — o que o cliente viu e validou |

- **Bundles:** [portal-fornecedor.html](../Prototipo/portal-fornecedor.html),
  [painel-administrativo.html](../Prototipo/painel-administrativo.html) e
  [index.html](../Prototipo/index.html) (**landing page** — jornada Prefeitura → landing → "Acessar Sistema";
  **sem contrapartida no código**, hoje `/` redireciona para `/cadastro`).
- **Régua entre código e bundle (2026-07-16, decisão do solicitante):** *o que já está implementado em código
  **permanece**; o que é novo no HTML **vira trabalho definido**.* O bundle **propõe**, o código **tem defesa**.
  Exceção: a **paleta** — é a marca do cliente, não escolha de engenharia (ver 0.7).
- ⚠️ **D1 — paleta, EM ABERTO (arbitragem 0.7).** O [`../Brandbook/`](../Brandbook/) oficial da Prefeitura usa
  `#0061AE` (52×) e `#003A68` (32×). Os bundles **e** a implementação (`frontend/src/index.css`) usam navy
  `#0A2A52`/`#0E3A6E`/`#14467F` — batem entre si e **divergem do brandbook**. O `DESIGN.md` não está
  desatualizado: ele destilou o brandbook corretamente. **A Prefeitura decide.**
- **UX-DR1–UX-DR10** vivem em [epics.md](epics.md) §"Decisões de UX". **Origem histórica:** os bundles vieram de
  `spec/AI-UI-Design/`, esvaziado em 2026-07-16 — os HTML foram preservados byte a byte em `Prototipo/` e o
  brandbook migrou para [`../Brandbook/`](../Brandbook/). O **Portal Público** ainda não tem mockup ratificado.

## Fila de histórias (canônica, em git)

A fila de trabalho é [epics.md](epics.md): 9 épicos, 31 histórias com AC em Given/When/Then,
rastreadas a RF/RN/AD. **Não há mais fila em `_bmad-output/`** (aqueles diretórios estão vazios e
fora do git — não usar). O sequenciamento de sprint segue [plano-releases.md](plano-releases.md).

## Como começar (ciclo de história)

1. `bmad-create-story` → próxima história a partir de [epics.md](epics.md) (começar pela **1.1 scaffold**).
2. `bmad-dev-story` → implementa (TDD) → `review`.
3. `bmad-code-review` → `done`.

## ⚠️ Pendências que a equipe precisa observar

- ⬛ **[ARBITRAGEM-01](ARBITRAGEM-01.md) respondida (2026-07-16).** O contrato passa a ser o **conjunto validado** (17 requisitos) — ver consequências no documento antes de escrever história.
- 🟢 **Épico 5 (Motor) DESTRAVADO** — Item × Lote resolvido: **item**. Pré-condição: alargar `SituacaoEdital` de 3 para 6 estados (AD-37).
- 🟡 **5B (impedimento permanente) e 6B (remover LGPD)** são posição do cliente, **pendentes de parecer**. Nenhum código de conformidade é removido antes disso.
- ⚖️ Parâmetros a ratificar (isolados como config, não bloqueiam o início amplo): default do desempate do motor, política de indisponibilidade de API, retenção LGPD por categoria, limite em MB do SEI (`SEI_MALOTE_LIMITE_MB`), teto de export de auditoria. Ver catálogo no [prd.md](prd.md) §16.
- 🎨 Decisões de UI: **LAYOUT A vs B** do login e **cor azul oficial** (brandbook) — ratificar antes do polimento de frontend.
- ⚖️ **LAC-22** (Validação 01): texto jurídico do **Termo de Responsabilidade** (RF024) pendente de validação do jurídico da Prefeitura — **bloqueia a Story 2.4** no desenvolvimento (não bloqueia o canônico). Dono: SMGA/Jurídico.
- 🔁 **LAC-23** (Validação 01): definir os **critérios exatos de convocação do Cadastro de Reserva** ("apenas em caso de falha do titular?") — refina RN004/UC009. Dono: SMGA/CPL.
- 📄 **LAC-24** (Validação 01): PDF do SEI — decidir se o sistema apenas **armazena** o PDF ou **extrai** dados (OCR/parse); risco de *scope creep* se for extração (impacta RF025/AD-39). Dono: TI/SMGA.
- ✅ **Conflito G5 (biometria)** — **FECHADO** pela ratificação do cliente na Validação 01.
- 🎨 **D1 resolvida (arbitragem 1): azul institucional `#0061AE`.** Story 9.3 desbloqueada com o critério de aceite novo. **Repintura real** — `index.css`, `tokens.ts`, contraste AA e os 3 bundles de `Prototipo/` (hoje navy). **LAYOUT A vs B** do login segue pendente (UX).

---
*Snapshot canônico atualizado em 2026-07-05 pela incorporação da Validação 01 do cliente ([VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md)), sobre a base consolidada em 2026-07-02 pela operação de convergência ([CONVERGENCIA.md](CONVERGENCIA.md)). Este diretório é versionado; é a fonte de verdade do projeto.*
