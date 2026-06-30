# Compra Mais — Pacote de Documentação para a Equipe de Desenvolvimento

**Projeto:** Compra Mais (Programa de Compras Municipalizadas — Prefeitura de Rio Branco)
**Snapshot:** 2026-06-29
**Origem:** `_bmad-output/planning-artifacts/` (cópia estável; revisada e consistente)

> Este `docs/` é o **pacote de leitura estável** para a equipe. A **fila de trabalho viva** (histórias e status do sprint) permanece em `_bmad-output/implementation-artifacts/` — não copiada aqui de propósito, para não divergir.

## Documentos (estáveis)

| Documento | Para quê |
|---|---|
| [prd.md](prd.md) | Requisitos (RF001–RF018, RNF001–RNF008, RN001–RN009), escopo, métricas — **v2.2** |
| [architecture/ARCHITECTURE-SPINE.md](architecture/ARCHITECTURE-SPINE.md) | Espinha de arquitetura: **31 ADs** (invariantes), stack, diagramas, conventions — `final` |
| [ux/DESIGN.md](ux/DESIGN.md) | Identidade visual e tokens (Poppins, azul-700 #0061AE, acessibilidade) |
| [ux/EXPERIENCE.md](ux/EXPERIENCE.md) | IA de navegação, telas, estados, jornadas |
| [epics.md](epics.md) | 9 épicos / 31 histórias com critérios de aceite (Given/When/Then) |
| [plano-releases.md](plano-releases.md) | Sequenciamento em 3 ondas + 4 gates |
| [matriz-lacunas.md](matriz-lacunas.md) | 21 lacunas catalogadas e suas resoluções |
| [implementation-readiness-report.md](implementation-readiness-report.md) | Avaliação de prontidão: PRONTO COM RESSALVAS |

## Fila de trabalho viva (NÃO copiada — fonte canônica)

- **Histórias:** `_bmad-output/implementation-artifacts/<epic>-<story>-*.md` (27 prontas em `ready-for-dev`)
- **Status do sprint:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Como começar (ciclo de história)

1. `bmad-create-story` → próxima história (já há 27 prontas; começar pela **1.1 scaffold**)
2. `bmad-dev-story` → implementa (TDD) → `review`
3. `bmad-code-review` → `done`

## ⚠️ Pendências que a equipe precisa observar

- 🔒 **Épico 5 (Motor)** está bloqueado até a ratificação de **Item × Lote** (SMGA/TCE). Não iniciar suas histórias antes disso.
- ⚖️ Decisões a ratificar (não bloqueiam o início amplo, isoladas como parâmetro): default do desempate do motor, política de indisponibilidade de API, retenção LGPD, limite em MB do SEI.
- 🎨 Decisões de UI: **LAYOUT A vs B** do login e **cor azul oficial** (brandbook) — ratificar antes do polimento de frontend; telas de Admin/Público a derivar.
- 🔗 Designs de origem (mockups ratificados): `source/AI-UI-Design/`.

---
*Snapshot gerado em 2026-06-29 a partir de `_bmad-output/planning-artifacts/`. Para a versão mais recente, consulte sempre a origem.*
