# Análise de Impacto da Validação - Compra Mais v1

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Data da Análise:** 2026-07-03
**Fonte da Análise:** `FeedbackValidacao01.md` (consolidado das visitas 5 e 6)

---

## Resumo Executivo

A sessão de validação com a equipe da Prefeitura de Rio Branco foi extremamente produtiva, confirmando a aderência dos fluxos principais do sistema, como a **Distribuição Inteligente** e o **Cadastro de Reserva**. No entanto, a reunião gerou mudanças significativas que visam simplificar a operação para os gestores e aumentar a segurança jurídica para todas as partes.

As principais alterações são:
1.  **Anexação do Edital Original:** O processo de criação de editais foi mantido, mas agora inclui a anexação do PDF original do SEI como um requisito para aumentar a transparência, sem substituir a necessidade de preenchimento completo dos dados no sistema.
2.  **Aumento da Segurança Jurídica:** Foram introduzidos um **Termo de Responsabilidade** sobre a capacidade produtiva e a **covalidação** da SMGA para formalizar a desistência de um fornecedor.
3.  **Vedação de Intervenção Manual:** Ficou decidido que o cálculo de distribuição de cotas é irrevogável e não pode ser editado manualmente por administradores, garantindo a isonomia.

Esta análise detalha o impacto dessas decisões nos artefatos do projeto, no backlog e no protótipo.

---

## Pontos Confirmados pelo Cliente

As seguintes regras e funcionalidades, já previstas na documentação, foram validadas e aprovadas pelo cliente.

| Item | Documento de Origem | Situação após Validação |
| :--- | :--- | :--- |
| **Cálculo Equitativo Restrito** | `00-HydrosSpec.md` (RN005), `03-HDR.md` (RF005) | **Confirmado.** A regra de que a distribuição é igualitária, mas limitada pela capacidade produtiva declarada, foi ratificada. |
| **Cadastro de Reserva** | `00-HydrosSpec.md` (RN004), `03-HDR.md` (RF006), `06-CasosUso.md` (UC009) | **Confirmado.** O fluxo para alocar fornecedores tardios em uma fila de espera, sem alterar as cotas já distribuídas, foi aprovado. |
| **Malote Digital para o SEI** | `00-HydrosSpec.md` (RN008), `03-HDR.md` (RF007), `06-CasosUso.md` (UC010) | **Confirmado.** A funcionalidade de exportar todos os documentos de um fornecedor em um único PDF/ZIP organizado foi aprovada. |
| **Landing Page de Transparência** | `03-HDR.md` (RF010), `06-CasosUso.md` (UC011) | **Confirmado.** A página pública com métricas e gráficos foi aprovada, com solicitações de ajustes de layout e conteúdo. |
| **Semântica de Status** | `00-HydrosSpec.md` (Seção 10) | **Confirmado.** A nomenclatura oficial dos status do fornecedor (`Cadastrado`, `Credenciado`, `Fornecedor`) foi decidida. |

---

## Mudanças Solicitadas

Ajustes pontuais que alteram a interface ou a apresentação da informação, sem modificar a lógica central.

| Item | Impacto | Artefatos Afetados |
| :--- | :--- | :--- |
| **Ocultar Rateio Global** | Ajuste de UI/UX na visão do fornecedor. A tela de resultado da distribuição deve mostrar apenas a cota atribuída à empresa logada, e não o comparativo com os concorrentes, para evitar conflitos. | Protótipo, Histórias de Usuário (Visão do Fornecedor). |
| **Ajuste da Landing Page** | Alteração de conteúdo e identidade visual. O título deve ser "Compra Mais Rio Branco", as logos da prefeitura devem ser inseridas e o e-mail de contato atualizado. | `03-HDR.md` (RF010), Protótipo. |
| **Nomenclatura de Alertas** | Ajuste de UI/UX para melhorar a comunicação. O status "Fornecedores Bloqueados" (por dívida) deve ser diferenciado de pendências documentais, que devem usar o status "Em Análise". | `06-CasosUso.md` (UC002, UC006), Protótipo. |

---

## Novas Regras de Negócio

Decisões tomadas na validação que se tornam regras de negócio mandatórias para o sistema.

| Regra | Origem da Validação | Impacto no Sistema |
| :--- | :--- | :--- |
| **Vedação da Edição Manual de Cotas** | `FeedbackValidacao01.md` | O sistema deve **bloquear** qualquer tentativa de um administrador editar manualmente o resultado do cálculo de distribuição (UC008). A matemática do algoritmo é soberana. |
| **Covalidação da Desistência** | `FeedbackValidacao01.md` | A ação de "desistir" de um edital por parte do fornecedor não é mais automática. Ela deve gerar uma pendência para que um administrador da SMGA aprove e formalize o ato, garantindo segurança jurídica. |

---

## Novos Requisitos

Funcionalidades que não estavam previstas na documentação original e que surgiram durante a validação.

| Requisito | Prioridade | Impacto |
| :--- | :--- | :--- |
| **RF-NOVO-01: Termo de Responsabilidade** | Must Have | Adicionar um checkbox com um termo de aceite legal no fluxo de credenciamento (UC004). O fornecedor deve atestar que se responsabiliza criminalmente pela capacidade produtiva informada. |
| **RF-NOVO-02: Anexação do PDF do Edital** | Must Have | Permitir que o administrador (SMGA) realize o upload do arquivo PDF original do edital (gerado no SEI) durante a criação do mesmo (UC005), para que os fornecedores possam baixá-lo. |

---

## Impacto em Casos de Uso

*   **UC005 - Criar Edital Individualizado:**
    *   **Impacto Baixo.** O fluxo principal de preenchimento dos dados do edital (itens, valores, CNAEs) foi mantido. A mudança consiste na **adição** de um novo passo obrigatório:
        1.  Ao final do preenchimento do formulário, o administrador deverá anexar o arquivo PDF original do edital, gerado no SEI.
    *   O objetivo é aumentar a transparência, permitindo que o fornecedor consulte o documento original. A funcionalidade não simplifica a criação, mas a enriquece com uma fonte de referência.

*   **UC008 - Distribuir Demanda Equitativamente:**
    *   **Impacto Médio.** A lógica de cálculo permanece a mesma, mas a nova regra **"Vedação da Edição Manual de Cotas"** torna o resultado imutável. Além disso, a pós-condição para o fornecedor muda, pois ele só visualizará sua própria cota (**"Ocultar Rateio Global"**).

*   **Necessidade de Novo Caso de Uso: UC-NOVO - Formalizar Desistência de Fornecedor**
    *   **Impacto Alto.** A regra de **"Covalidação da Desistência"** cria um fluxo inédito que precisa ser documentado.
    *   **Atores:** Fornecedor, Administrador SMGA.
    *   **Fluxo:**
        1.  Fornecedor clica em "Desistir" de um edital.
        2.  Sistema altera o status do credenciamento para "Pendente de Desistência".
        3.  Administrador da SMGA visualiza a solicitação em um painel de pendências.
        4.  Administrador clica em "Confirmar Desistência", podendo adicionar uma observação.
        5.  Sistema formaliza a saída do fornecedor e, se aplicável, aciona o próximo da fila do Cadastro de Reserva.

---

## Impacto em Histórias de Usuário

*   **HU do Administrador (Criar Edital):**
    *   **DEVE SER ATUALIZADA/COMPLEMENTADA.** A história original de preenchimento do edital permanece válida. Uma nova história ou critério de aceite deve ser adicionado: "Como administrador, ao criar um edital, quero também anexar o documento PDF original para que ele fique disponível para consulta dos fornecedores, garantindo maior transparência."

*   **HU do Fornecedor (Ver Resultado da Distribuição):**
    *   **DEVE SER ATUALIZADA.** De: "Como fornecedor, quero ver o resultado completo da distribuição..." Para: "Como fornecedor, quero ver de forma clara e objetiva qual foi a cota de fornecimento atribuída à minha empresa."

*   **NOVAS HISTÓRIAS DE USUÁRIO:**
    *   **HU - Termo de Responsabilidade:** "Como fornecedor, ao informar minha capacidade produtiva, quero assinalar um termo de responsabilidade para dar validade legal à minha declaração."
    *   **HU - Desistência Covalidada:** "Como fornecedor, quero poder solicitar a desistência de um edital, e como administrador da SMGA, quero aprovar essa solicitação para que o ato seja formalizado com segurança jurídica."

---

## Impacto no Backlog

Os seguintes itens devem ser adicionados ou ajustados no backlog do projeto:

*   **Novos Itens:**
    *   `Feature`: Implementar upload de arquivo PDF no formulário de criação de edital.
    *   `Feature`: Implementar download do PDF do edital na visão do fornecedor.
    *   `Feature`: Adicionar aceite de "Termo de Responsabilidade" no fluxo de credenciamento.
    *   `Feature`: Desenvolver o fluxo completo de "Covalidação de Desistência" (telas para fornecedor e admin).
*   **Itens para Ajuste:**
    *   `Task`: Modificar a tela de resultado da distribuição (visão do fornecedor) para ocultar dados de outros participantes.
    *   `Task`: Alterar textos, logos e e-mail na Landing Page de Transparência.
    *   `Task`: Revisar e alterar a nomenclatura de status de "Bloqueado" para "Em Análise" nos fluxos de validação documental.

---

## Impacto no Protótipo

*   **Já Representado:**
    *   Fluxo de login e cadastro inicial via CNPJ.
    *   Anexação de documentos pelo fornecedor.
    *   Estrutura base da Landing Page de Transparência.
    *   Conceito do Malote Digital (botão de exportação).
    *   Lógica do algoritmo de distribuição (validada conceitualmente).

*   **Parcialmente Representado (Necessita Ajuste):**
    *   **Tela de Resultado da Distribuição:** Precisa ser ajustada para ocultar dados de terceiros.
    *   **Landing Page:** Precisa de ajustes de conteúdo (título, logo, e-mail).
    *   **Alertas e Status:** A nomenclatura "Bloqueado" precisa ser revista e alterada para "Em Análise" quando apropriado.

*   **Não Representado (Necessita Criação):**
    *   A funcionalidade de **upload do PDF do edital** no formulário de criação.
    *   O **checkbox de "Termo de Responsabilidade"** no fluxo de credenciamento.
    *   O fluxo de **"Covalidação de Desistência"** (tanto a ação do fornecedor quanto a aprovação do admin).
    *   A funcionalidade para o fornecedor **baixar o PDF do edital**.

---

## Dúvidas em Aberto e Pontos de Atenção

| Item | Status | Observação |
| :--- | :--- | :--- |
| **API de Reconhecimento Facial** | Não Validada Tecnicamente | A funcionalidade foi demonstrada como fluxo, mas a tecnologia não foi homologada. A documentação (`00-HydrosSpec.md`) já a classifica como "Fora do Escopo (V1)". A validação reforça a decisão de adiamento. |
| **Capacidade superestimada** | Resolvida | A dúvida sobre o que fazer se um fornecedor informar uma capacidade produtiva irreal foi mitigada pela criação do novo requisito **"Termo de Responsabilidade"**, que adiciona uma camada de responsabilização legal. |
| **Gestão de Retardatários** | Resolvida | A dúvida foi sanada pela confirmação da regra de negócio do **"Cadastro de Reserva"**, já prevista nos artefatos. |

---

## Recomendações para Próxima Validação

Para a próxima sessão de validação com o cliente, recomenda-se focar nos fluxos que sofreram maior impacto ou que são completamente novos:

1.  **Apresentar o protótipo do novo fluxo de criação de edital**, demonstrando o upload do PDF e o preenchimento dos metadados.
2.  **Apresentar o protótipo do fluxo de credenciamento**, agora incluindo a etapa de aceite do "Termo de Responsabilidade".
3.  **Apresentar o protótipo do fluxo de "Covalidação de Desistência"**, mostrando a jornada do fornecedor e a tela de aprovação do administrador.
4.  **Validar formalmente o adiamento da Biometria Facial** para uma fase futura, garantindo o alinhamento de escopo para o MVP.