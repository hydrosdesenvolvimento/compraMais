# HydrosSpec - Compra Mais

**Projeto:** Compra Mais - Plataforma de Compras Municipalizadas  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 1.0  
**Data:** 2026-06-22  

---

## 1. Visão Geral

O **Compra Mais** é uma plataforma B2G (Business-to-Government) de gestão de compras públicas e credenciamento digital. Atua como um "marketplace reverso" auditável que conecta as demandas de secretarias municipais (ex: compras de fardamentos, mobiliário) diretamente aos fornecedores locais. A plataforma substitui o trâmite físico de papéis por um portal de autoatendimento contínuo, distribuindo o volume de compras de forma justa e matematicamente atrelada à capacidade produtiva de cada empresa, em conformidade com a Lei de Licitações 14.133/21.

---

## 2. Problema de Negócio

O sistema ataca dores crônicas em três frentes:

*   **Para a Prefeitura (CPL/SMGA):** Elimina a burocracia e o retrabalho de conferir repetidamente os mesmos documentos físicos a cada edital, a necessidade de comprimir arquivos manualmente para o sistema SEI e a consulta manual de débitos em múltiplos sites governamentais.
*   **Para os Fornecedores Locais:** Remove a barreira de acesso e a necessidade de "caçar editais" no Diário Oficial. Substitui um processo analógico, que exige idas à prefeitura, por um portal digital simplificado.
*   **Para o Controle e Transparência:** Mitiga o risco de fraudes documentais (ex: PDFs forjados) e elimina a subjetividade na distribuição de cotas, que gerava suspeitas de favorecimento e pressões sobre os servidores.

---

## 3. Objetivos

*   **Fomentar a Economia Local:** Garantir que o recurso municipal seja investido em micro e pequenos negócios da própria cidade.
*   **Automatizar a Triagem Legal:** Bloquear sistematicamente a participação de fornecedores com inadimplência fiscal ou dívida ativa no município.
*   **Reduzir o Tempo de Ciclo:** Acelerar o processo de credenciamento através da integração com a Receita Federal e da geração de malotes digitais organizados para o sistema SEI.
*   **Garantir Continuidade do Abastecimento:** Gerenciar fornecedores que se credenciam tardiamente através de uma fila de "Cadastro de Reserva", sem paralisar os contratos já em andamento.

---

## 4. Público-Alvo

*   **Fornecedor Local (MEI, ME, Médias Empresas):** Usuário final que se cadastra e participa dos editais.
*   **Administrador / Gestor do Sistema (SMGA / CPL):** Servidores que criam editais, validam documentos e gerenciam o sistema.
*   **Demandantes (Secretarias Municipais):** Clientes internos que originam as demandas de compras.
*   **Espectadores Estratégicos (Prefeito, FIEAC, População):** Usuários do portal de transparência.

---

## 5. Personas

*   **Maria (Fornecedora Local):** Dona de uma pequena malharia, quer uma forma simples de vender para a prefeitura, sem burocracia repetitiva e com regras claras.
*   **Silas (Administrador CPL):** Servidor público que precisa de eficiência para gerenciar múltiplos editais, reduzir o trabalho manual e ter uma trilha de auditoria clara para se resguardar legalmente.
*   **Prefeito (Gestor Municipal):** Precisa de dados concretos para demonstrar o fomento à economia local e garantir a transparência dos gastos públicos.

---

## 6. Módulos do Sistema

*   **Catálogo/Cadastros Base:** Onboarding de fornecedores via CNPJ com integração à Receita Federal.
*   **Credenciamento e Covalidação:** Gestão de adesões aos editais, checagem de inadimplência e aprovação/reprovação de documentos com justificativa.
*   **Gestão de Editais:** Criação e publicação de editais individualizados (1 Edital = 1 Demanda de Secretaria).
*   **Distribuição Inteligente:** Motor matemático para rateio equitativo de itens entre os fornecedores habilitados.
*   **Integração Processual (Malote SEI):** Consolidação e compressão de documentos em um pacote estruturado para o sistema SEI.
*   **Auditoria e Logs:** Registro imutável de todas as ações críticas para fins de compliance.
*   **Dashboard (BI Público):** Portal de transparência com dados de investimento e participação.
*   **Administração do Sistema:** Painel interno para gestão operacional e notificações.

---

## 7. Fluxos Principais

1.  **Cadastro de Fornecedor:** O usuário insere o CNPJ, o sistema busca os dados na Receita Federal e o perfil é criado.
2.  **Credenciamento em Edital:** O fornecedor encontra um edital compatível (filtrado por CNAE), manifesta interesse e submete os documentos e sua capacidade produtiva.
3.  **Análise e Covalidação:** O sistema realiza checagens automáticas de débitos. Um analista da CPL revisa documentos críticos (ex: Balanço), aprovando ou reprovando com justificativa obrigatória.
4.  **Distribuição de Demanda:** Após o prazo, o sistema calcula a divisão igualitária dos itens entre os fornecedores habilitados, respeitando o teto de capacidade de cada um.
5.  **Gestão de Retardatários:** Fornecedores aprovados após a distribuição inicial são alocados em um "Cadastro de Reserva" para não impactar contratos em andamento.
6.  **Geração de Malote SEI:** O analista da CPL gera um arquivo PDF único, comprimido e ordenado, contendo todos os documentos aprovados de um fornecedor, pronto para ser anexado ao processo no SEI.

---

## 8. Regras de Negócio Essenciais

*   **RN001 (Filtro por CNAE):** O sistema deve exibir aos fornecedores apenas os editais compatíveis com seu ramo de atividade (CNAE).
*   **RN002 (Tolerância Zero à Inadimplência):** O sistema deve impedir o avanço de fornecedores com débitos ativos nas bases da PGM, SICAF e outras.
*   **RN003 (Análise Antifraude):** A reprovação de um documento por um analista exige o preenchimento de uma justificativa textual.
*   **RN004 (Gestão de Retardatários):** Fornecedores tardios são alocados no "Cadastro de Reserva" sem alterar as distribuições já feitas.
*   **RN005 (Teto de Distribuição):** A quantidade de itens alocada a um fornecedor não pode exceder sua capacidade produtiva declarada.
*   **RN007 (Individualização de Editais):** Cada edital deve estar vinculado a uma única secretaria demandante. Editais "guarda-chuva" são proibidos.
*   **RN008 (Ordenação do Malote SEI):** O malote digital deve seguir a ordem: 1º Cartão CNPJ, 2º Identificação do Sócio, 3º Anexos do Edital, 4º Certidões.

---

## 9. Entidades Principais

*   **Fornecedor:** Representa a empresa local (CNPJ, dados cadastrais, documentos).
*   **Edital:** Representa a demanda de uma secretaria (objeto, itens, prazos, regras).
*   **Documento:** Arquivo de habilitação (ex: Balanço Patrimonial) com status (Pendente, Aprovado, Reprovado).
*   **Credenciamento:** Tabela que conecta um Fornecedor a um Edital, gerenciando seu status de participação.
*   **Distribuição:** Registro do resultado do cálculo de rateio, vinculando itens a fornecedores.
*   **Auditoria:** Tabela de logs imutáveis que registra todas as ações críticas.

---

## 10. Status e Ciclos de Vida

*   **Fornecedor em um Edital:** Requerente -> (Análise) -> Credenciado -> (Distribuição) -> Fornecedor.
*   **Documento:** Pendente de Análise -> Aprovado / Reprovado.
*   **Edital:** Rascunho -> Aberto -> Em Distribuição -> Em Execução -> Fechado.
*   **Credenciamento de Retardatário:** Requerente -> (Análise) -> Aprovado (em Cadastro de Reserva).

---

## 11. Integrações

*   **Receita Federal (API REST):** Para buscar dados da empresa via CNPJ. (Obrigatória).
*   **PGM Municipal (API REST):** Para checar dívida ativa local. (Obrigatória, alto risco de dependência).
*   **Bases de Débitos Federais/Estaduais (API REST):** Para checagem ampla de inidoneidade (ex: SICAF). (Obrigatória).
*   **Sistema SEI (Exportação de Arquivo):** O sistema gera um "malote" em PDF comprimido para upload manual no SEI.
*   **Serviços de Mensageria (E-mail/SMS):** Para notificar fornecedores sobre vencimento de certidões.

---

## 12. Segurança

*   **Controle de Acesso (RBAC):** Perfis distintos (Fornecedor, Admin CPL, Secretaria) com permissões específicas.
*   **Covalidação Obrigatória:** A interface força o preenchimento de justificativa para reprovação de documentos.
*   **Auditoria e Rastreabilidade:** Todas as ações críticas geram uma trilha irrefutável (IP, Timestamp, Usuário, dados alterados).
*   **Proteção de Dados (LGPD):** Criptografia de dados sensíveis em trânsito e em repouso.

---

## 13. Auditoria

Todas as operações que alteram o estado de entidades críticas (aprovação de documento, mudança de status, cálculo de distribuição) devem ser registradas em uma tabela de log imutável (append-only). O log deve conter o usuário, timestamp, IP e o payload da mudança (estado "antes" e "depois"), preferencialmente em formato JSON. Este é um requisito fundamental para a segurança jurídica do processo.

---

## 14. Restrições

*   **Técnica:** O tamanho do arquivo "malote" gerado é limitado pela capacidade de upload do sistema SEI da prefeitura.
*   **Legal:** O algoritmo de distribuição deve ser equitativo e respeitar a capacidade declarada para não ferir a isonomia.
*   **Temporal:** Um protótipo funcional deve ser apresentado em 30 de junho de 2026.

---

## 15. Fora do Escopo (para a V1)

*   **Outras Modalidades de Licitação:** Não haverá pregão, leilão ou disputa de lances. Apenas Credenciamento.
*   **Editais Agrupados:** Não haverá editais "guarda-chuva" para múltiplas secretarias.
*   **Gestão de Patrimônio/Leilão:** Escopo do projeto paralelo "Patrimônio Circular".
*   **Integração Bidirecional com SEI:** A V1 apenas exporta arquivos para o SEI.
*   **Biometria Facial:** Adiado para fases futuras devido à complexidade e custo.
*   **App Mobile Nativo:** A plataforma será web responsiva.

---

## 16. Design System

A identidade visual do sistema deve seguir rigorosamente o Brandbook oficial da Prefeitura de Rio Branco.

*   **Identidade Visual:** Profissional, clara e com estética governamental.
*   **Paleta de Cores:** A cor primária é o **Azul** institucional da prefeitura. Seu uso é mandatório nas interfaces públicas, como o Portal da Transparência.
*   **Tipografia, Componentes, Layout, UX:** A experiência do usuário deve ser simples e intuitiva, facilitando o autoatendimento por fornecedores com diferentes níveis de letramento digital.
*   **Diretrizes para IA:** Interfaces geradas por IA devem aderir à paleta de cores azul, manter um layout limpo e usar componentes acessíveis.
*   **Referência Oficial:** A especificação visual completa e oficial está documentada no arquivo `00-DesignSystem.md`.

---

## 17. MVP Recomendado

*   **Must Have (Essencial):**
    *   Cadastro de fornecedor com integração à Receita Federal.
    *   Filtro de editais por CNAE.
    *   Covalidação de documentos com justificativa de reprovação.
    *   Gestão automática do "Cadastro de Reserva".
    *   Geração do "Malote SEI" comprimido e ordenado.
    *   Motor de distribuição equitativa.
*   **Should Have (Recomendado):**
    *   Integração com PGM/SICAF para bloqueio automático de devedores.
    *   Portal público de transparência (na cor azul).
*   **Could Have (Desejável):**
    *   Notificações por SMS sobre vencimento de certidões.

---

## 18. Roadmap Sugerido

*   **Fase 1 (MVP):** Implementar todos os itens "Must Have" e "Should Have" para entregar o núcleo de valor do produto.
*   **Fase 2 (Evolução):** Implementar itens "Could Have" (ex: notificações SMS). Reavaliar e, se aprovado, desenvolver a funcionalidade de Biometria Facial.
*   **Fase 3 (Expansão):** Explorar integrações mais profundas, como uma API bidirecional com o SEI, e considerar um aplicativo móvel nativo com base na demanda.

---

## 19. Critérios de Validação

*   Um fornecedor com débitos conhecidos deve ser bloqueado pelo sistema ao tentar se credenciar.
*   A interface deve obrigar um administrador a preencher uma justificativa ao reprovar um documento.
*   Um fornecedor aprovado tardiamente deve ser alocado no "Cadastro de Reserva" sem alterar contratos existentes.
*   A funcionalidade de "Exportar Malote" deve gerar um arquivo único, comprimido e com os documentos na ordem correta.
*   O portal público de transparência deve exibir os indicadores corretos e usar a identidade visual azul da prefeitura.

---

## 20. Pontos de Atenção

*   **Dependência Crítica de APIs Externas:** O sucesso do bloqueio automático de inadimplentes (RN002) depende totalmente da disponibilização de chaves de API e documentação técnica para o sistema da PGM (municipal) e outras bases de dados governamentais. Este é um risco de projeto crítico.
*   **Validação do Limite do SEI:** O tamanho máximo de arquivo (em MB) suportado pelo sistema SEI da prefeitura é desconhecido. Este valor é essencial para configurar o motor de compressão do "Malote SEI" e precisa ser confirmado formalmente pela equipe de TI do município.
*   **Decisão sobre Biometria Facial:** A funcionalidade foi discutida como uma trava antifraude, mas consistentemente marcada como de alta complexidade, custo e risco para o cronograma do MVP. Uma decisão final é necessária para confirmar seu adiamento para uma fase futura.
*   **Escopo de Integração com Patrimônio:** A documentação menciona o projeto "Patrimônio Circular" como um sistema separado. Os pontos de contato ou passagem de dados entre os dois sistemas, embora fora do escopo do Compra Mais, não estão definidos e podem necessitar de esclarecimentos futuros.

---

## 21. Prompt Inicial para Ferramentas de IA

```text
Atue como um desenvolvedor full-stack sênior. Sua tarefa é criar um protótipo navegável da plataforma "Compra Mais" usando os seguintes artefatos e diretrizes:

1.  **Fonte Principal de Verdade:** Utilize o documento `00-HydrosSpec.md` como a fonte única e principal de verdade para todas as regras de negócio, fluxos, entidades e requisitos.
2.  **Documentação Complementar:** Os demais arquivos do projeto (`01-DescritivoProduto.md`, `02-DeclaracaoEscopo.md`, etc.) devem ser usados apenas como contexto adicional, se necessário. Em caso de conflito, o `00-HydrosSpec.md` prevalece.
3.  **Respeito às Regras:** Implemente as regras de negócio e os fluxos de forma integral, especialmente o filtro por CNAE, a gestão do cadastro de reserva e a lógica de distribuição.
4.  **Design System:** A interface deve seguir estritamente o Design System resumido no HydrosSpec, com ênfase na paleta de cores azul institucional da prefeitura para as telas públicas. A referência completa está em `00-DesignSystem.md`.
5.  **Foco no MVP:** Crie inicialmente um MVP navegável que cubra os fluxos principais (cadastro, credenciamento, análise, distribuição e geração de malote).
6.  **Dados Mockados:** Utilize dados mockados para todas as entidades (fornecedores, editais, etc.). Não implemente o banco de dados real nesta primeira versão.
7.  **Sem Integrações Reais:** Simule as respostas das integrações externas (Receita Federal, PGM, SICAF). Não tente se conectar a APIs reais. O objetivo é validar os fluxos de tela e a lógica de negócio.

Comece criando a estrutura do projeto e a tela de cadastro de fornecedor.
```