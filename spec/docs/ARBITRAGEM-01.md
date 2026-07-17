---
name: 'Compra Mais — Arbitragem 01'
type: decision-request
status: aberto
created: '2026-07-16'
destinatarios: [Prefeitura de Rio Branco, Procuradoria, DPO, SMGA]
bloqueia: ['spec/docs/epics.md', 'spec/docs/casos-de-uso.md', 'spec/docs/prd.md']
---

# Compra Mais — 7 definições pendentes

**Duas versões das regras do sistema foram escritas. Precisamos que a Prefeitura diga qual vale.**

São 7 perguntas. Cada uma tem 2 opções. Marque um X.

> **Este arquivo é o registro normativo** — tem o anexo técnico e a rastreabilidade.
> **O que vai à mesa e recebe assinatura é [ARBITRAGEM-01.html](ARBITRAGEM-01.html)**, o instrumento
> de coleta: mesma substância, formato de ofício, com as duas cores da pergunta 1 impressas em
> tamanho real. Relação declarada nos dois sentidos (AD-39 — não é cópia divergente).
> **Em caso de divergência, este registro prevalece.**

Elas vão para **4 destinatários diferentes** e podem ser respondidas **em paralelo** — nenhuma
espera a outra. O anexo técnico está no fim, para quem quiser; nenhuma resposta depende dele.

| Envelope | Perguntas | Prazo sugerido |
|---|---|---|
| 🏛️ **Prefeitura** (reunião) | 1 · 2 · 3 · 4 | 1 reunião |
| ⚖️ **Procuradoria** (parecer) | 5 | parecer |
| 🔒 **DPO / Jurídico** (parecer) | 6 | parecer |
| 🏗️ **SMGA** (técnico) | 7 | 1 conversa |

---

# 🏛️ Envelope 1 — Prefeitura de Rio Branco

## 1. O sistema vai usar a cor da Prefeitura?

O manual de identidade visual da Prefeitura define um azul. O protótipo que a Prefeitura viu e
aprovou usa **outro azul**, mais escuro. O sistema foi construído seguindo o protótipo.

| | **A) Manter o azul do protótipo** | **B) Usar o azul do manual da Prefeitura** |
|---|---|---|
| Cor | Azul-marinho escuro (`#0A2A52`) | Azul institucional (`#0061AE`) |
| É o que | a Prefeitura **aprovou na validação** | está no **manual de identidade** |
| Custo | **zero** — já está pronto | ajuste de cores em todas as telas |
| Risco | sistema não usa a cor oficial | retrabalho visual |

**Resposta:** ☐ A ☐ B

> *Esta é a única pergunta que não depende de nenhuma outra. Pode ser respondida hoje.*

---

## 2. Qual conjunto de regras é o contrato?

Existem dois documentos completos descrevendo o sistema, escritos com **um dia de diferença**, e
eles se contradizem em pontos importantes. Um foi feito pela equipe técnica; o outro é o que foi
apresentado e validado com a Prefeitura.

| | **A) Conjunto técnico** (2 de julho) | **B) Conjunto validado** (3 de julho) |
|---|---|---|
| Tem | 23 requisitos, proteção de dados pessoais completa, perfis de acesso, trilha de auditoria | 17 requisitos, **sem nenhuma regra de proteção de dados** |
| Foi | **escrito pela equipe** — ninguém da Prefeitura assinou | **apresentado e validado** com a Prefeitura (visitas 5 e 6) |
| Se vencer | o que foi validado com a Prefeitura precisa ser reincorporado | as regras de proteção de dados precisam ser reescritas do zero |

**Resposta:** ☐ A ☐ B ☐ **C) Vale o A, com os itens novos do B incorporados** *(recomendação da equipe)*

> *O sistema foi construído seguindo o conjunto A. A opção C preserva o que está pronto e adiciona
> o que a Prefeitura pediu.*

---

## 3. Alguns itens têm o mesmo número e significados diferentes. Qual vale?

Consequência direta da pergunta 2. Oito itens têm o **mesmo código** nos dois documentos, querendo
dizer coisas **diferentes**. Enquanto isso não for definido, uma tarefa escrita como "implementar
o item 15" pode virar duas coisas opostas — e as duas passariam na revisão.

| Código | No conjunto técnico significa | No conjunto validado significa |
|---|---|---|
| RF015 | Login e troca de senha | Termo de Responsabilidade Legal |
| RF016 | Tela de contestação | Baixar o edital em PDF |
| RF017 | Direitos do cidadão sobre seus dados | Aprovação de desistência |
| RN009 | Dados da Receita não podem ser editados | Distribuição não pode ser alterada |
| RN010 | Vínculo de procurador | Formalização da desistência |
| UC015 | Login e senha | Baixar o edital original |
| UC016 | Contestar / regularizar | Formalizar desistência |

**Resposta:** ☐ **A) Renumerar o conjunto validado** *(recomendação — o sistema já usa os códigos do conjunto técnico)* ☐ B) Renumerar o conjunto técnico

---

## 4. A verificação por foto (prova de vida) entra?

O protótipo aprovado mostra uma etapa opcional de **reconhecimento facial** no credenciamento. Os
dois documentos discordam sobre o motivo de ela estar fora: um diz que foi removida por proteção de
dados; o outro diz que foi adiada por custo. **O sistema hoje não tem essa etapa.**

| | **A) Fica fora do MVP** | **B) Entra** |
|---|---|---|
| Custo | zero | integração + parecer de proteção de dados obrigatório |
| Consequência | o protótipo mostra uma etapa que o sistema não terá | atrasa a entrega |

**Resposta:** ☐ A *(recomendação — decisão conservadora já adotada)* ☐ B

---

### Assinatura — Envelope 1

| | |
|---|---|
| Nome | ______________________________________ |
| Cargo | ______________________________________ |
| Data | ____ / ____ / ________ |
| Assinatura | ______________________________________ |

> **Enquanto estas quatro definições não existirem, a construção do sistema segue em risco de
> retrabalho.** Não é um pedido de aprovação de gasto: é a definição de qual regra vale. Toda semana
> sem ela é uma semana construindo sobre a interpretação de alguém.

---

# ⚖️ Envelope 2 — Procuradoria (parecer)

## 5. Uma empresa com dívida fica impedida para sempre, ou até quitar?

Os dois documentos discordam **frontalmente**:

| | **A) Impedimento temporário** | **B) Impedimento permanente** |
|---|---|---|
| Regra | a empresa fica bloqueada **enquanto** houver débito; quita, volta | débito ativo detectado = **fora da plataforma para sempre** ("Tolerância Zero") |
| Está em | conjunto técnico | conjunto validado |

**A equipe registrou risco jurídico na opção B.** A avaliação interna aponta possível conflito com
a **LC 123/2006** e com a **Lei 14.133/2021**, além de contrariar o objetivo declarado do programa —
incluir MEI e microempresas locais na compra pública municipal.

**Não é uma escolha de gestão: é mérito jurídico.** Assinar não torna legal.

**Parecer:** ☐ A ☐ B ☐ Outro: _______________________________________

> *Esta pergunta **não bloqueia** as demais. Corre em paralelo.*

---

# 🔒 Envelope 3 — DPO / Jurídico (parecer)

## 6. As regras de proteção de dados (LGPD) permanecem?

O conjunto validado com a Prefeitura **não menciona proteção de dados pessoais em momento algum** —
sem encarregado (DPO), sem relatório de impacto, sem regras de retenção, sem base legal.

O sistema **já tem** essa parte construída e funcionando: painel do titular, atendimento de
solicitações, trilha de auditoria.

| | **A) Mantém** | **B) Remove** |
|---|---|---|
| Consequência | é preciso designar formalmente um encarregado (DPO) e emitir o relatório de impacto | **apaga-se conformidade já construída** de um sistema que trata CNPJ e documentos de empresas reais |

**Parecer:** ☐ A *(recomendação unânime da equipe)* ☐ B

> ⚠️ **Pendência independente da resposta:** o projeto **ainda não tem encarregado (DPO) designado**.
> Isso é exigência legal, não preferência técnica.

---

# 🏗️ Envelope 4 — SMGA (técnico)

## 7. A distribuição é por item ou por lote?

O cálculo de rateio foi construído assumindo **item**. Se o funcionamento real for por **lote**, não
é ajuste de configuração — é **reconstrução** da parte central do sistema.

| | **A) Item** | **B) Lote** |
|---|---|---|
| | o cálculo já está pronto | reconstrução do motor de distribuição |

**Resposta:** ☐ A ☐ B

> 🔴 **Esta é a pergunta mais cara do documento.** A distribuição justa de cotas — a razão de existir
> do Compra Mais — **está parada esperando por ela desde junho**. O cálculo está construído e testado;
> as telas estão desenhadas e aprovadas; nada foi ligado porque ninguém confirmou item ou lote.
>
> **É a resposta que destrava mais trabalho por menos esforço.**

---
---

# Anexo técnico

> Para quem quiser o detalhe. **Nenhuma resposta acima depende deste anexo.**

## Rastreabilidade

| Pergunta | ID interno | Origem | Rastreio |
|---|---|---|---|
| 1 | **0.7** (D1) | `spec/Brandbook/` × `spec/Prototipo/` × `frontend/src/index.css` | [ux/DESIGN.md](ux/DESIGN.md) · AD-39 |
| 2 | **0.1** | `spec/docs/` × `Requisitos/`+`CasosUso/`+`Backlog/` | [CONVERGENCIA.md](CONVERGENCIA.md) · [index.md](index.md) |
| 3 | **0.3** | colisão de identificadores entre os dois conjuntos | [prd.md](prd.md) · [casos-de-uso.md](casos-de-uso.md) |
| 4 | **0.6** (G5) | `facialChecking`/`facialDone` nos bundles × RF012 fora do MVP | [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md) G5 |
| 5 | **0.2** | RN002 transitório × "Tolerância Zero" | [matriz-lacunas.md](matriz-lacunas.md) **LAC-08** 🔴 |
| 6 | **0.4** | RNF007/RNF008/RF017/UC017 ausentes na v2 | [matriz-lacunas.md](matriz-lacunas.md) **LAC-09** 🔴 |
| 7 | **0.5** | motor assume item; AD-7/AD-24/AD-21 | [matriz-lacunas.md](matriz-lacunas.md) **LAC-16** · ARCHITECTURE-SPINE §Questões Abertas |

## Detalhe da pergunta 1 (paleta)

| Fonte | azul-900 | azul-800 | azul-700 (ação) |
|---|---|---|---|
| **Brandbook oficial** (`spec/Brandbook/`) | `#003A68` | `#00497F` | **`#0061AE`** (52 ocorrências) |
| **Bundles ratificados** (`spec/Prototipo/`, desde 29/06) | `#0A2A52` | `#0E3A6E` | **`#14467F`** |
| **Implementação** (`frontend/src/index.css`) | `#0A2A52` | `#0E3A6E` | **`#14467F`** |

Bundles e código **batem entre si** e divergem do brandbook. O `DESIGN.md` não estava desatualizado —
destilou o brandbook corretamente. **Story 9.3 está bloqueada** por isto: seu critério de aceite
fixava um hex que nenhum artefato usa.

## Detalhe da pergunta 7 (item × lote) — o que está parado

| Artefato | Estado |
|---|---|
| `backend/src/distribuicao/domain/motor.ts` | **implementado, puro, testado — importado por ninguém** (`grep` = 0 hits) |
| Tela **Distribuição** (admin) | ratificada no bundle (rateio + `Homologar distribuição`) — **zero código** |
| Tela **Demandas distribuídas** (fornecedor) | ratificada (rateio, teto, reserva) — **zero código**; o menu aponta para `/transparencia` |
| **Cadastro de Reserva** · **Desistências** | ratificadas — zero código |
| `SituacaoEdital` | código tem **3** estados; AD-37 e os bundles exigem **6** — pré-condição das telas acima |

## Fora deste documento (não são arbitragem)

Itens que não dependem de decisão externa e já estão em correção:

- **RBAC por header** — 12 testes vermelhos em `backend/tests/integration/rbac-identidade-jwt.spec.ts` (viola AD-20/AD-35)
- **Documentos em memória** — `DocumentoRepositoryMemory` sem adaptador durável nem migração
- **Consentimento não persistido** — `consentimentosRepo` é *no-op* (viola AD-19)
- **6 rotas com ID de demonstração** chumbado em `frontend/src/router.tsx`
- **Menu "Demandas distribuídas"** apontando para tela diferente

## Régua vigente (decisão do solicitante, 2026-07-16)

> *O que já está implementado em código **permanece**; o que é novo no HTML **vira trabalho definido**.*

**Exceção única:** a **pergunta 1** (paleta). É a marca do cliente, não escolha de engenharia.
