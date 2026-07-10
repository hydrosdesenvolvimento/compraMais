# RIPD — Relatório de Impacto à Proteção de Dados Pessoais

## Prova de Vida (Liveness) no credenciamento — RF012 / UC007

**Projeto:** Compra Mais (Programa de Compras Municipalizadas — Prefeitura de Rio Branco)
**Fundamento:** LGPD (Lei nº 13.709/2018), Art. 5º, XVII e Art. 38; orientações da ANPD para RIPD.
**Rastreável a:** [prd.md](../prd.md) (RF012, RN016, §12) · [casos-de-uso.md](../casos-de-uso.md) (UC007) · [epics.md](../epics.md) (Story 5.6) · [architecture/ARCHITECTURE-SPINE.md](../architecture/ARCHITECTURE-SPINE.md) (AD-4, AD-12, AD-18, AD-30).

> **Natureza deste documento.** Este RIPD é o **gate formal de LGPD** que a ratificação de 2026-07-09 exigiu
> para reabrir o RF012 (biometria facial) no MVP. Ele documenta o tratamento, seus riscos e as salvaguardas
> técnicas **já implementadas** (feature flag, não-retenção da imagem, `fail-open + flag`). **Não substitui o
> parecer jurídico/DPO institucional:** a ativação em produção (`LIVENESS_ENABLED=true`) depende da aprovação
> do Encarregado (DPO) e, quando aplicável, da Procuradoria (LAC-09/LAC-10). Enquanto não aprovado, a feature
> permanece **desligada** e o credenciamento conclui por Termo de Aceite (UC004/RN016).

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-07-09 | Tech Lead + Business Analyst (ratificação do solicitante) | Versão inicial do RIPD para a prova de vida do credenciamento (RF012/UC007) |

---

## 1. Contexto e responsáveis

| Papel | Atribuição |
|---|---|
| **Controlador** | Prefeitura Municipal de Rio Branco (órgão demandante do Compra Mais). |
| **Encarregado (DPO)** | Papel `dpo` no sistema (UC017); designação institucional é pré-condição de go-live (plano-releases, gate LAC-09). |
| **Operador (suboperador)** | Provedor de liveness (serviço de verificação biométrica). No MVP, adaptador **mock**; o provedor real exige contrato/DPA antes de ativar. |
| **Titulares** | Fornecedores (pessoas físicas: Titular ou Procurador que realiza a prova de vida no ato do credenciamento). |

**Finalidade específica:** confirmar a **presença de uma pessoa viva** (liveness) no ato do envio do
credenciamento, mitigando fraude por terceiros — o vetor que originou a exigência de identidade forte
(AD-30: ação em nome da empresa sem rastro/autorização, por procurador/contador).

---

## 2. Descrição do tratamento

### 2.1 Dados tratados

| Dado | Categoria LGPD | Observação |
|---|---|---|
| Amostra facial (frame/vídeo curto de liveness) | **Sensível — dado biométrico** (Art. 5º, II) | **Transitória**: usada apenas para o desafio de liveness; **NÃO é persistida** pela aplicação. |
| Veredito (`aprovada` / `reprovada` / `indisponivel`) + score | Dado pessoal (associado ao fornecedor) | Persistido e auditável (AD-18). |
| Metadados do desafio (provedor, timestamp, ator/empresa) | Dado pessoal / operacional | Persistido; base da trilha e da flag para a CPL. |

### 2.2 Base legal
- **Consentimento específico e destacado** do titular para o tratamento biométrico (Art. 7º, I c/c Art. 11, I),
  registrado **antes** da captura. Sem consentimento, a etapa é **bloqueada** (UC007, exceção) — não há
  tratamento sem base legal.
- Execução de política pública / procedimento de credenciamento (Art. 7º, III; Art. 23) como base do
  **processo** de contratação, sendo o dado biométrico tratado **apenas** com o consentimento acima.

### 2.3 Fluxo e ciclo de vida
1. Fornecedor consente com a prova de vida (registro do consentimento — reaproveita `Consentimento`, domínio LGPD existente).
2. Captura de liveness → amostra enviada ao provedor via **ACL** (AD-4), com circuit breaker.
3. Provedor retorna **veredito + score**; a aplicação persiste **somente** veredito, score, provedor e timestamp.
4. A amostra facial **não é gravada** em banco, storage nem log (minimização, Art. 6º, III).
5. Veredito entra na **trilha append-only** (AD-18) para auditoria e exercício de direitos (UC012/UC017).

**Retenção:** o veredito segue a retenção da instrução de credenciamento (categoria cadastral/processual);
a **amostra biométrica não é retida**. Exclusão/anonimização de dados pessoais atende UC017 (direitos do titular).

---

## 3. Necessidade e proporcionalidade

- **Necessidade:** a prova de vida endereça um risco real de fraude de identidade no credenciamento público
  (uso indevido por procurador/contador). É medida proporcional ao objetivo de integridade do processo.
- **Minimização:** trata-se o **mínimo** — não se retém a imagem; guarda-se apenas o **resultado** da verificação.
- **Reversibilidade / não-exclusão:** a feature é **desligável** (`LIVENESS_ENABLED`); enquanto desligada,
  o processo funciona por Termo de Aceite sem qualquer tratamento biométrico.
- **Não-discriminação:** falha de liveness **não** inabilita automaticamente — permite repetição (A1) e, na
  indisponibilidade do provedor (A2), **não bloqueia** o fornecedor: aplica-se `fail-open + flag` para
  covalidação **humana** de identidade pela CPL (AD-12), preservando o direito de participação (LC 123).

---

## 4. Riscos aos titulares e medidas de mitigação

| # | Risco | Probabilidade × Impacto | Mitigação implementada |
|---|---|---|---|
| R1 | Vazamento de dado biométrico (imagem facial) | Baixa × Alto | **Não-retenção da amostra**: a aplicação nunca persiste imagem/vídeo; só veredito+score. |
| R2 | Tratamento sem base legal | Baixa × Alto | Consentimento específico obrigatório **antes** da captura; ausência → etapa bloqueada. |
| R3 | Exclusão indevida de fornecedor por falso negativo do liveness | Média × Alto | A1 permite repetir; nunca inabilita sozinho; decisão de habilitação continua humana (UC006). |
| R4 | Provedor indisponível travar o credenciamento | Média × Médio | A2: `fail-open + flag` (AD-12) — prossegue sinalizado à CPL, sem auto-aprovação. |
| R5 | Reidentificação / uso secundário do dado | Baixa × Alto | Finalidade única (liveness); sem retenção da amostra; trilha auditável (AD-18); direitos do titular (UC017). |
| R6 | Ativação acidental antes do parecer do DPO | Baixa × Alto | Feature flag **default OFF**; ativação exige mudança de ambiente + aprovação do DPO (gate de go-live). |
| R7 | Suboperador (provedor real) sem garantias | Média × Alto | Provedor real exige contrato/DPA e verificação de conformidade **antes** de substituir o mock. |

---

## 5. Decisão e condicionantes

**Parecer técnico:** o tratamento é **viável e proporcional** desde que mantidas as salvaguardas acima. A
implementação já entrega: (a) feature flag default OFF; (b) não-retenção da amostra; (c) consentimento como
pré-condição; (d) `fail-open + flag` na indisponibilidade; (e) trilha auditável.

**Condicionantes para ativar em produção (`LIVENESS_ENABLED=true`):**
1. 🔴 Aprovação do **Encarregado (DPO)** designado (LAC-09).
2. 🔴 **Contrato/DPA** com o provedor real de liveness e verificação de conformidade (substitui o mock).
3. ⚖️ Ratificação da **Procuradoria** quando exigida (LAC-10), à luz do risco de exclusão (LC 123).
4. 🟡 Registro do **texto de consentimento** biométrico específico (versão/finalidade) no catálogo do Termo.

Enquanto as condicionantes 🔴 não forem atendidas, a feature permanece **desligada** e o RF012 opera apenas
como capacidade latente do sistema, sem tratar dado biométrico real.

---

*Documento de governança — `spec/docs/lgpd/RIPD-prova-de-vida.md`. PT-BR (DEC-STR-25). Ratificação registrada em 2026-07-09.*
