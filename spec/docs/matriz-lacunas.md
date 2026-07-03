# Compra Mais - Plataforma de Compras Municipalizadas

## Matriz de Lacunas de Requisitos

---

**Projeto:** Compra Mais
**Cliente:** Prefeitura Municipal de Rio Branco
**Versão:** 2.0
**Data:** 2026-06-29
**Autores:** Mary (Business Analyst) e Paige (Technical Writer) — sessão BMad Party Mode (roster software-development)
**Origem:** Análise dos documentos em `source/` (01-Descritivo, 02-Escopo, 03-HDR, 04-Arquitetura, 05-Histórias, 06-Casos de Uso, 07-Backlog, 08-BPMN, Relatório de Validação de Diagramas)

---

## Controle de Versão

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-29 | Mary / Paige (Party Mode) | Versão inicial — catalogação de 21 lacunas a partir do `source/` |
| 2.0 | 2026-06-29 | Mary / Paige (Party Mode) | Mergulhos em LAC-04, LAC-08, LAC-09; LAC-10 fechada; correção da contagem (a própria LAC-01); pontos de convergência LAC-11 e LAC-17 |

---

## Conclusão Executiva

A documentação de requisitos possui uma **espinha de rastreabilidade consistente** (HU ↔ RF ↔ RN ↔ UC ↔ Backlog em geral fecha), porém apresenta **21 lacunas** (numeração estável até LAC-21; a LAC-04 fragmentou-se em 6 sub-lacunas após mergulho).

### Placar de severidade (pós-mergulhos)

| Nível | Qtde | Lacunas |
|---|---|---|
| 🔴 Bloqueador | 3 | LAC-05, LAC-09, LAC-17 |
| 🟠 Alto | 8 | LAC-03, LAC-06, LAC-07, LAC-11, LAC-12, LAC-16, LAC-21, LAC-04e |
| 🟡 Médio | 8 | LAC-01, LAC-02, LAC-13, LAC-14, LAC-15, LAC-18, LAC-20, LAC-08*, LAC-04c, LAC-04d |
| ✅ Resolvida na sessão | 4 | LAC-04a, LAC-04b, LAC-04f, LAC-10 |
| ⚪ Baixo | 1 | LAC-19 |

> \* **LAC-08** está rebaixada a 🟡 na engenharia, **mas mantém um flag 🔴 de mérito jurídico** (possível ilegalidade — ver detalhe). Conta como decisão pendente de Procuradoria.

**Padrão observado:** as bloqueadoras restantes concentram-se em **dependências/decisões externas** — um número que falta (LAC-05: limite do SEI), uma assinatura que falta (LAC-17: chaves de API) e um parecer que falta (LAC-09: LGPD). Quase nada se resolve com código; resolve-se com **reunião, número e assinatura**. Os mergulhos técnicos (LAC-04) foram majoritariamente fechados na própria sessão.

---

## Legenda de Severidade

| Símbolo | Nível | Critério |
|---|---|---|
| 🔴 | Bloqueador | Impede construção, teste ou aprovação; risco jurídico ou de dependência crítica |
| 🟠 | Alto | Compromete escopo, conformidade ou experiência essencial |
| 🟡 | Médio | Inconsistência ou indefinição relevante, contornável no curto prazo |
| ✅ | Resolvida | Fechada durante a sessão |
| ⚪ | Baixo | Dúvida menor ou provável fora de escopo |

---

## Pontos de Convergência (descobertos nos mergulhos)

Dois itens reaparecem como dependência de várias lacunas — devem ser tratados **uma vez**, não por lacuna:

- **LAC-11 (tela de contestação/direitos do titular)** — a mesma tela serve: correção de CNAE errado (LAC-12), exercício de direitos LGPD (LAC-09) e regularização de bloqueio fiscal (LAC-08). **Uma tela, três lacunas.**
- **LAC-17 (reunião de interoperabilidade)** — a reunião que destrava as chaves de API destrava também os acordos de compartilhamento Art. 26 LGPD (LAC-09) e a política de fail-closed na queda de API (LAC-08). **Uma reunião, três lacunas.**

---

## Bloco A — Integridade Documental

| ID | Lacuna | Evidência | Sev | Pergunta de Fechamento |
|---|---|---|---|---|
| **LAC-01** | Contagem oficial diverge do corpo: Resumo declara "10 RF / 7 RN"; o corpo lista RF001–RF014 e RN001–RN008. *(Nota: a v1.0 desta matriz repetiu o erro — declarou 6 bloqueadoras quando eram 5; corrigido na v2.0.)* | `03-HDR.md` Resumo Executivo vs. seções RF/RN | 🟡 | Qual é a baseline oficial de requisitos? Recontar e versionar |
| **LAC-02** | Integração **LICON** órfã: citada uma única vez, sem RF/UC/RN associado | `03-HDR.md` RNF001 | 🟡 | LICON está no escopo? Qual o propósito? |
| **LAC-15** | Selo "✅ PRONTO PARA PRODUÇÃO / RN 10/10" cobre apenas sintaxe de Mermaid | `RELATORIO-VALIDACAO-DIAGRAMAS.md` | 🟡 | Rebaixar o escopo do selo; validação real de RN segue pendente |
| **LAC-20** | RF010 (portal público) sem stack de BI definida — PowerBI barrado por licença | `03-HDR.md` Restrições + RF010 | 🟡 | Qual ferramenta de BI/relatório nativa? |

---

## Bloco B — Intestável / Inconstruível

| ID | Lacuna | Evidência | Sev | Pergunta de Fechamento |
|---|---|---|---|---|
| **LAC-04** | Motor de distribuição "sem fórmula" → **mergulhado**: fragmentado em LAC-04a–f (ver seção "Resoluções da Sessão") | `03-HDR.md` RF005/RN005; `06-CasosUso.md` UC008 | — | Ver sub-lacunas |
| **LAC-05** | Limite em MB do SEI **desconhecido** — o próprio documento confessa que precisa "obter formalmente" | `03-HDR.md` Lacunas; RNF002/RN008 | 🔴 | Obter o limite em MB oficial junto à TI da Prefeitura |
| **LAC-06** | RNF005 "disponível a qualquer momento" sem SLA numérico | `03-HDR.md` RNF005 | 🟠 | Meta de disponibilidade (99%? 99,9%?) e janela de manutenção? |
| **LAC-07** | RF009 exige SMS/e-mail, mas **nenhum gateway** consta nas integrações (RNF001) | `03-HDR.md` RF009 vs RNF001 | 🟠 | Qual provedor de SMS/e-mail? Custo? Opt-in? |
| **LAC-17** | Premissa "Prefeitura proverá acessos" + Pendência "chaves/APIs definitivas" — dependência **não confirmada** | `03-HDR.md` Premissas + Resumo Executivo | 🔴 | Status real dos contratos de interoperabilidade (PGM/SICAF/Receita)? |
| **LAC-18** | Carga inicial (histórico de preços/itens) dependente e sem detalhamento | `03-HDR.md` Dependências Externas | 🟡 | Fonte, formato e prazo da carga inicial? |

---

## Bloco C — Conformidade Jurídica

| ID | Lacuna | Evidência | Sev | Pergunta de Fechamento |
|---|---|---|---|---|
| **LAC-08** | RN002 bloqueia **"permanentemente"** por inadimplência → **mergulhado**: bloqueio deve ser transitório; ⚠️ contradiz LC 123/Lei 14.133 e a missão do projeto (ver Resoluções) | `03-HDR.md` RN002; `01-Descritivo` (missão) | 🟡 / **🔴 mérito** | Procuradoria: bloqueio permanente é legal? Recomendação: transitório |
| **LAC-09** | **Ausência total de LGPD** (CNPJ, docs de sócios, biometria) → **mergulhado**: pacote de recomendação pronto (ver Resoluções) | Ausência transversal; RF012; `04-Arquitetura` (S3) | 🔴 | Base legal, retenção, descarte, RIPD, DPO, acordos Art. 26 |
| **LAC-10** | RF012 (biometria) com status contraditório | `03-HDR.md` RF012 vs Lacunas | ✅ | **Fechada** se acatada a remoção da biometria do MVP (LAC-09) |
| **LAC-16** | RNF004 exige "por item e não por lote" (TCE), mas escopo/BPMN falam em "Lotes e itens" | `03-HDR.md` RNF004 vs `02-Escopo` + `08-BPMN` | 🟠 | O MVP é por item, por lote ou ambos? |
| **LAC-21** | Restrição de cronograma (30/06/2026) pede "protótipos funcionais auditáveis **e testados**" | `03-HDR.md` Restrições | 🟠 | O que sobe na FIEAC é protótipo de demo ou produção? |

---

## Bloco D — Fluxos Ausentes

| ID | Lacuna | Evidência | Sev | Pergunta de Fechamento |
|---|---|---|---|---|
| **LAC-03** | **Sem requisito de autenticação recorrente**: RF001 só cadastra; SSO em "Dependências" sem RF | `03-HDR.md` RF001 + Dependências | 🟠 | Como o fornecedor faz login depois? gov.br/SSO? MFA? Reset? |
| **LAC-11** | **Sem fluxo de contestação/recurso** — **ponto de convergência** (LGPD + correção CNAE + regularização fiscal) | `03-HDR.md` RN001, RF003, RF004 | 🟠 | Existe recurso/reenvio? SLA da CPL? (unificar com LAC-08/09/12) |
| **LAC-12** | RF001 permite **CNAE manual** se a API cair, sem definir quem covalida → vetor de fraude | `03-HDR.md` Critérios + `07-Backlog` BI-001 | 🟠 | Quem valida o CNAE manual? Bloqueia editais até validar? |
| **LAC-13** | RN006 manda o **sistema** "comprovar idoneidade" do balanço, mas é covalidação **humana** (RN003) | `03-HDR.md` RN006 vs RN003 | 🟡 | O que é automático × análise humana? |
| **LAC-14** | RF006/RN004 "Cadastro de Reserva" sem **ciclo de vida** claro (parcialmente esclarecido por UC009) | `03-HDR.md` RF006/RN004; `06-CasosUso` UC009 | 🟡 | Gatilho e regra de promoção da reserva? (substituição via UC009 alt.) |
| **LAC-19** | GPI/Leilão/desfazimento — dúvida aberta sobre qual sistema cuida | `03-HDR.md` Lacunas | ⚪ | Confirmar fora do escopo do MVP |

---

## Resoluções da Sessão (Mergulhos)

### LAC-04 — Motor de Distribuição

**Descoberta:** o UC008 (`06-CasosUso.md`, linhas 210–229) **descreve, sim, o algoritmo** que o HDR omitiu — é **water-filling** (divisão igualitária + teto por capacidade declarada, com redistribuição do excedente). Logo, a LAC-04 não era "sem fórmula", e sim "mal-especificada". Fragmentada em:

| Sub-ID | Sub-lacuna | Resolução | Sev |
|---|---|---|---|
| LAC-04a | Semântica de "igualitária" | **Resolvida**: water-filling (igual + teto) | ✅ |
| LAC-04b | UC008 redistribui em **passada única** → viola RN005 (pode estourar teto de outro) | **Resolvida**: corrigir redação para redistribuição **iterativa** até estabilizar | ✅ |
| LAC-04c | **Resto/fração** de item indivisível (o doc admite, linha 443, que precisa de crivo SMGA) | **Recomendação pronta**: método de **Hamilton (maiores restos)** → aguarda ratificação jurídica SMGA | 🟡 |
| LAC-04d | **Critério de desempate** determinístico (exigência TCE) | **Recomendação pronta**: **ordem de credenciamento** (isonomia temporal); backstop **menor CNPJ** → aguarda TCE/SMGA | 🟡 |
| LAC-04e | **Capacidade autodeclarada** sem validação → vetor de fraude / pune honestidade | Em aberto: ligar à covalidação humana (RN003) | 🟠 |
| LAC-04f | **Determinismo/idempotência** do motor (auditoria RNF003) | **Resolvida**: motor puro, reproduzível, com desempate logado; travar reexecução após contrato | ✅ |

**Algoritmo recomendado (pseudocódigo):**
```
1. cota_ideal = water-filling iterativo (divide igual; quem excede teto trava no teto;
   redistribui o saldo aos não-travados; REPETE até ninguém exceder).
2. Cada fornecedor recebe PISO(cota_ideal).
3. resto R = demanda − soma(pisos).
4. Distribui os R itens (um a um) a quem tem MAIOR parte fracionária E folga de teto.
5. Empate → ordem de credenciamento; persistindo → menor CNPJ.
6. Exceção: capacidade_total < demanda → alerta de déficit (UC008 já cobre).
7. Registrar matriz de alocação + sementes de desempate na trilha imutável (RNF003).
```

### LAC-08 — Bloqueio por Inadimplência

**Descoberta:** "permanentemente" contradiz a natureza transitória da inadimplência **e** o direito de regularização da ME/EPP (LC 123 / Lei 14.133) — que é justamente o público que o projeto quer fomentar. **Contradição de missão**, não só de redação.

- **Engenharia (pronta):** reescrever RN002 como **estado reavaliado em cada porta** (credenciamento → distribuição → contrato); separar **débito regularizável** (bloqueia enquanto ativo), **penalidade com prazo** (bloqueia até a data) e **inidoneidade** (pelo termo declarado); política **fail-closed** na queda de API; tela de motivo + regularização (LAC-11).
- **Mérito (🔴, Procuradoria):** confirmar se o bloqueio permanente é legal frente à LC 123. Recomendação da sala: **nunca permanente**.

### LAC-09 — LGPD

| Item | Recomendação | Quem ratifica |
|---|---|---|
| Biometria (RF012) | **Remover do MVP** (minimização, Art. 6 III) → fecha LAC-10 | SMGA/jurídico |
| Base legal | Mapear por categoria (CNPJ/CNAE: política pública; sócios: competência pública; biometria: consentimento Art. 11) | DPO/Procuradoria |
| Bloco RNF-LGPD novo | Cifra em repouso e trânsito, retenção+descarte, segregação de acesso | Time técnico |
| Direitos do titular | Telas de consentimento/acesso/correção/exclusão (unifica com LAC-11) | UX + jurídico |
| DPO/Encarregado | Designar (Art. 41 — obrigatório p/ órgão público) | Prefeitura |
| RIPD + acordos Art. 26 | Redigir — **mesma reunião da LAC-17** | DPO + TI |

---

## Próximos Passos Recomendados

1. **Convocar a reunião única de interoperabilidade** (LAC-17): chaves de API + acordos Art. 26 LGPD + política fail-closed. Destrava 3 lacunas.
2. **Obter dois números** que faltam: limite em MB do SEI (LAC-05) e prazos de retenção (LAC-09).
3. **Levar à Procuradoria 3 decisões de mérito**: bloqueio transitório (LAC-08), remoção da biometria (LAC-09/10), desempate do motor (LAC-04c/d) — todas com recomendação pronta.
4. **Especificar a "tela de contestação" uma vez** (LAC-11) cobrindo correção, direitos LGPD e regularização.
5. **Alimentar o PRD** (`bmad-prd`) usando as perguntas de fechamento como roteiro de descoberta.
6. **Reconciliar a contagem de requisitos** (LAC-01) e republicar a baseline oficial do HDR.

---

## Documentos Relacionados

- [01 - Descritivo do Produto](../source/01-DescritivoProduto.md)
- [02 - Declaração de Escopo](../source/02-DeclaracaoEscopo.md)
- [03 - HDR](../source/03-HDR.md)
- [05 - Histórias de Usuário](../source/05-HistoriasUsuario.md)
- [06 - Casos de Uso](../source/06-CasosUso.md)
- [07 - Backlog](../source/07-Backlog.md)
- [Relatório de Validação de Diagramas](../source/RELATORIO-VALIDACAO-DIAGRAMAS.md)

---

*Documento produzido em sessão BMad Party Mode (roster software-development) — 2026-06-29.*
