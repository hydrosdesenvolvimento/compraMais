# Feedback da Validação - Compra Mais v1

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 1.0  
**Data:** 2026-07-02  
**Autor:** Equipe de Análise de Requisitos  

---

## Controle de Versão

| Versão | Data       | Autor                       | Alteração                                       |
|--------|------------|-----------------------------|-------------------------------------------------|
| 1.0    | 2026-07-02 | Equipe de Análise de Requisitos | Versão inicial consolidando o feedback das visitas 5 e 6. |

---

## Sumário

- [Feedback da Validação - Compra Mais v1](#feedback-da-validação---compra-mais-v1)
  - [Controle de Versão](#controle-de-versão)
  - [Sumário](#sumário)
  - [Resumo da Validação](#resumo-da-validação)
  - [Funcionalidades Validadas e Aprovadas](#funcionalidades-validadas-e-aprovadas)
  - [Ajustes Solicitados (UI/UX e Nomenclatura)](#ajustes-solicitados-uiux-e-nomenclatura)
  - [Funcionalidades Não Validadas](#funcionalidades-não-validadas)
  - [Dúvidas Levantadas](#dúvidas-levantadas)
  - [Novos Requisitos Identificados](#novos-requisitos-identificados)
  - [Regras de Negócio](#regras-de-negócio)
    - [Regras Confirmadas](#regras-confirmadas)
    - [Regras Alteradas](#regras-alteradas)
  - [Alterações de Fluxo](#alterações-de-fluxo)
  - [Decisões Estratégicas Tomadas](#decisões-estratégicas-tomadas)
  - [Pendências e Próximos Passos](#pendências-e-próximos-passos)

---

## Resumo da Validação

As sessões de validação (visitas 5 e 6) confirmaram a aderência dos fluxos principais do sistema, como a **Distribuição Inteligente** e o **Malote Digital**. Foram solicitados ajustes de UI/UX para melhorar a experiência do fornecedor e a comunicação visual. Surgiram novos requisitos importantes, como o **Termo de Responsabilidade** e a **Anexação do PDF do Edital**, além de alterações significativas em regras de negócio, como a **vedação da edição manual de cotas** e a **covalidação da desistência**, que impactam diretamente a segurança jurídica e a isonomia do processo.

---

## Funcionalidades Validadas e Aprovadas

*   **Dashboard e Cadastro (Visão Fornecedor):** Validados os fluxos de login, validação de ID e CNAE, anexação de documentos, alertas de certidões a vencer e o conceito de "prova de vida" com selfie.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Distribuição Inteligente:** Validado o algoritmo que realiza o rateio das demandas respeitando a capacidade produtiva declarada por cada fornecedor.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor e 6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*
*   **Landing Page de Transparência:** Aprovada a página pública contendo métricas, histórico de investimentos e gráficos de fomento à economia local.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*
*   **Malote Digital:** Aprovada a funcionalidade de exportar todos os documentos do fornecedor em um único arquivo PDF/ZIP organizado para anexar ao SEI.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Ajustes Solicitados (UI/UX e Nomenclatura)

*   **Ocultar Rateio Global:** A tela do fornecedor deve ser ajustada para ocultar o comparativo de quanto os outros receberam da cota do edital. Deve aparecer apenas a demanda total e a cota atribuída exclusivamente a ele, para evitar reclamações.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Ajuste da Landing Page:** Alterar o título principal para "Compra Mais Rio Branco", usar as logos da prefeitura e modificar o e-mail genérico para o e-mail oficial da comissão (`comissoes.smga22@gmail.com`).
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*
*   **Nomenclatura de Alertas:** Trocar o nome do card "Fornecedores Bloqueados" (que se refere a dívida ativa) para "Em Análise" caso a pendência seja meramente de validação documental, tornando a comunicação mais clara.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Funcionalidades Não Validadas

*   **API de Reconhecimento Facial:** O fluxo de "prova de vida" foi demonstrado e aprovado conceitualmente, mas a tecnologia específica (API) por trás ainda não foi homologada tecnicamente.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*

---

## Dúvidas Levantadas

*   **Dúvida:** Como fica a capacidade do fornecedor se ele informar um valor muito alto (ex: 1 milhão) por ganância e não der conta de entregar?
    *   **Solução:** A dúvida foi mitigada pela criação do novo requisito **"Termo de Responsabilidade"** (ver abaixo), que adiciona uma camada de responsabilização legal sobre a informação declarada.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Dúvida:** Como gerir os fornecedores retardatários que chegam após o prazo do edital ou quando a cota já foi totalmente distribuída?
    *   **Solução:** A dúvida foi sanada pela confirmação da regra de negócio do **"Cadastro de Reserva"** (ver abaixo), que já estava prevista.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Novos Requisitos Identificados

*   **Termo de Responsabilidade:** Inserir um checkbox/termo com validade legal atestando que o fornecedor se responsabiliza criminalmente pela capacidade produtiva que está informando.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Anexação do PDF do Edital:** A SMGA precisará de uma funcionalidade para realizar o upload do arquivo PDF original do edital (gerado no SEI), para que os fornecedores possam baixar e ler diretamente no sistema.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Regras de Negócio

### Regras Confirmadas

*   **Cálculo Equitativo Restrito:** A distribuição é justa e igualitária, porém limitada à capacidade de cada um. Se um fornecedor tiver capacidade menor que sua fração igualitária, o excedente é redistribuído aos demais de forma inteligente.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor e 6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*
*   **Cadastro de Reserva:** Fornecedores que entregarem os documentos fora do prazo inicial (ex: após os 5 dias) não alterarão as cotas já distribuídas; ficarão alocados como "Cadastro de Reserva / Segunda Demanda" para atuarem caso haja desistência.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

### Regras Alteradas

*   **Vedação da Edição Manual de Cotas:** Ficou decidido que os administradores/secretários **não poderão** editar a cota do fornecedor manualmente no sistema para "favorecer" ou fazer um "jeitinho". A matemática do sistema será irrevogável.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Criação do Edital:** Foi alterada a premissa de que o administrador preencheria todos os dados do edital em formulários longos. Optou-se por subir o PDF do SEI diretamente, preenchendo apenas metadados básicos.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Alterações de Fluxo

*   **Jornada de Entrada:** O acesso do usuário não ocorrerá num link seco de login. O fluxo inicia acessando o site da Prefeitura, que direciona para a Landing Page pública do Compra Mais, e a partir dela haverá o botão para "Acessar Sistema/Cadastrar".
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor e 6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*
*   **Fluxo de Desistência:** O botão de desistência acionado pelo fornecedor não o remove automaticamente do processo. A ação exigirá uma **covalidação** da SMGA no sistema para formalizar o ato com segurança jurídica.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Decisões Estratégicas Tomadas

*   **Semântica de Status:** Os fornecedores terão a seguinte nomenclatura oficial de status:
    1.  **Cadastrado:** Realizou o cadastro inicial.
    2.  **Credenciado:** Teve seus documentos aprovados pela SMGA em um edital.
    3.  **Fornecedor:** Assumiu uma cota/contrato após a distribuição.
    *   *Fonte: [5_visita_técnica_validação_protótipo_compra_mais_visão_fornecedor]*
*   **Identidade Visual:** Aprovada a adoção das cores, tipografias e logomarcas institucionais do Município e do projeto para as versões finais do layout.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*

---

## Pendências e Próximos Passos

*   **Assinatura do "Termo de Acordo / Validação de Regras"** formal por parte da Prefeitura para liberar a construção efetiva do código do sistema.
*   **Análise técnica de PDFs do SEI** para validar se o sistema precisará extrair os dados via leitura automática ou se apenas os armazenará.
*   **Reunião de alinhamento sobre a infraestrutura de TI** do município onde os contêineres e repositórios da aplicação serão hospedados.
    *   *Fonte: [6visita_técnica_validação_protótipo_compra_mais_visão_administrador]*