# Backlog V2 - Compra Mais

**Projeto:** Compra Mais  
**Cliente:** Prefeitura Municipal de Rio Branco  
**Versão:** 2.0  
**Data:** 2026-07-03

---

## Resumo

Backlog gerado a partir da **Validação 01** (visitas 5 e 6) e do cruzamento com os artefatos atualizados: `03-HDR-v2.md`, `05-HistoriasUsuario-v2.md` e `06-CasosUso-v2.md`. Os itens estão organizados por Épicos e priorizados para o desenvolvimento do MVP e fases subsequentes.

---

## Épicos

### ÉPICO-01 – Gestão de Fornecedores
- **FEATURE-001:** Cadastro Integrado (Receita Federal)
- **FEATURE-002:** Verificação de Inadimplência
- **FEATURE-003:** Repositório Documental Reutilizável
- **FEATURE-004:** Termo de Responsabilidade Legal
- **FEATURE-005:** Revisão da Nomenclatura de Status

### ÉPICO-02 – Gestão de Editais
- **FEATURE-006:** Filtro de Editais por CNAE
- **FEATURE-007:** Covalidação Humana de Documentos
- **FEATURE-008:** Upload e Controle de Edital Oficial (PDF)
- **FEATURE-009:** Download do Edital Oficial (PDF)
- **FEATURE-010:** Solicitação de Desistência pelo Fornecedor
- **FEATURE-011:** Aprovação de Desistência pelo Administrador

### ÉPICO-03 – Distribuição Inteligente
- **FEATURE-012:** Motor de Distribuição Inteligente
- **FEATURE-013:** Bloqueio de Edição Manual de Cotas
- **FEATURE-014:** Ocultação do Rateio Global na Visão do Fornecedor
- **FEATURE-020:** Gestão do Cadastro de Reserva

### ÉPICO-04 – Transparência Pública
- **FEATURE-015:** Portal Público de Transparência
- **FEATURE-016:** Adequação da Identidade Visual (Landing Page)

### ÉPICO-05 – Administração e Conformidade
- **FEATURE-017:** Geração de Malote SEI Otimizado
- **FEATURE-018:** Dashboard Interno de Gestão
- **FEATURE-019:** Trilha de Auditoria Imutável

---

## FEATURE-001
### Nome
Cadastro Integrado (Receita Federal)
### Objetivo
Permitir que fornecedores se cadastrem de forma rápida e segura, utilizando o CNPJ para preencher dados automaticamente.
### Descrição
O sistema deve consumir a API da Receita Federal para buscar dados cadastrais (Razão Social, CNAEs, Porte) a partir do CNPJ informado, minimizando erros de digitação e validando a existência da empresa.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF001
### Histórias Relacionadas
- HU-001
### Casos de Uso Relacionados
- UC001
### Telas do Protótipo Relacionadas
- Tela de Cadastro
### Critérios de Pronto
- Endpoint da API da Receita Federal mapeado.
- Fluxo de cadastro definido no protótipo.
### Critérios de Aceite
- Ao inserir um CNPJ válido, os campos Razão Social, Nome Fantasia, Porte e CNAEs são preenchidos.
- Se a API estiver indisponível, o sistema deve permitir o preenchimento manual.

---

## FEATURE-002
### Nome
Verificação de Inadimplência
### Objetivo
Impedir que empresas com débitos fiscais participem dos credenciamentos.
### Descrição
O sistema deve se integrar com as bases de dados da PGM e outras bases federais/estaduais para verificar a situação de adimplência do fornecedor no momento do credenciamento.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF011, RN002
### Histórias Relacionadas
- HU-002
### Casos de Uso Relacionados
- UC002
### Telas do Protótipo Relacionadas
- Painel do Administrador, Detalhes do Fornecedor
### Critérios de Pronto
- APIs de consulta de débito (PGM, SICAF) disponíveis e com acesso liberado.
### Critérios de Aceite
- Fornecedor com débito ativo é impedido de prosseguir no credenciamento.
- O status de bloqueio por inadimplência é claramente diferenciado de pendências documentais.

---

## FEATURE-003
### Nome
Repositório Documental Reutilizável
### Objetivo
Otimizar o processo de credenciamento permitindo que o fornecedor reutilize documentos já enviados.
### Descrição
Os documentos enviados (Contrato Social, Certidões) devem ser armazenados em um repositório seguro. Para novos editais, o sistema deve importar automaticamente os documentos que ainda estão válidos.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF002
### Histórias Relacionadas
- HU-007
### Casos de Uso Relacionados
- UC004
### Telas do Protótipo Relacionadas
- Fluxo de Credenciamento
### Critérios de Pronto
- Estratégia de armazenamento de arquivos (Object Storage) definida.
### Critérios de Aceite
- Ao se credenciar, o sistema anexa automaticamente documentos válidos já existentes no perfil do fornecedor.

---

## FEATURE-004
### Nome
Termo de Responsabilidade Legal
### Objetivo
Adicionar uma camada de responsabilização jurídica sobre a capacidade produtiva informada pelo fornecedor.
### Descrição
Durante o fluxo de credenciamento, o fornecedor deverá aceitar um termo de responsabilidade, atestando criminalmente pela veracidade da capacidade produtiva informada. Sem o aceite, o sistema deve impedir o prosseguimento.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF015
### Histórias Relacionadas
- HU-009
### Casos de Uso Relacionados
- UC004
### Telas do Protótipo Relacionadas
- Fluxo de Credenciamento
### Critérios de Pronto
- Texto do termo de responsabilidade validado pelo jurídico da prefeitura.
### Critérios de Aceite
- O sistema deve exibir um checkbox com o termo de aceite antes da submissão da proposta.
- O botão "Prosseguir" deve permanecer desabilitado até que o checkbox seja marcado.
- A ação de aceite deve ser registrada na trilha de auditoria (UC012).

---

## FEATURE-005
### Nome
Revisão da Nomenclatura de Status
### Objetivo
Melhorar a comunicação com o usuário, tornando os status mais claros e menos ambíguos.
### Descrição
Ajustar a nomenclatura de status no sistema. O status "Fornecedores Bloqueados" deve ser usado apenas para inadimplência, enquanto pendências documentais devem usar o status "Em Análise".
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF011
### Histórias Relacionadas
- HU-002
### Casos de Uso Relacionados
- UC002, UC006
### Telas do Protótipo Relacionadas
- Painel do Administrador, Detalhes do Fornecedor
### Critérios de Pronto
- Mapeamento de todos os status do sistema e suas novas nomenclaturas.
### Critérios de Aceite
- Na interface, um fornecedor com dívida ativa aparece como "Bloqueado por Inadimplência".
- Um fornecedor aguardando análise de documentos aparece como "Em Análise".

---

## FEATURE-006
### Nome
Filtro de Editais por CNAE
### Objetivo
Exibir aos fornecedores apenas as oportunidades de negócio relevantes para seu ramo de atuação.
### Descrição
O sistema deve cruzar os CNAEs do fornecedor logado com os CNAEs exigidos nos editais abertos, exibindo apenas os compatíveis.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF003, RN001
### Histórias Relacionadas
- HU-003
### Casos de Uso Relacionados
- UC003
### Telas do Protótipo Relacionadas
- Painel do Fornecedor - Vitrine de Editais
### Critérios de Pronto
- Lógica de cruzamento de CNAEs definida.
### Critérios de Aceite
- O fornecedor só visualiza editais que correspondem a pelo menos um de seus CNAEs cadastrados.

---

## FEATURE-007
### Nome
Covalidação Humana de Documentos
### Objetivo
Garantir a integridade e a veracidade dos documentos através de uma análise manual antifraude.
### Descrição
A CPL/SMGA deve ter uma interface para analisar os documentos submetidos, podendo aprová-los ou reprová-los. A reprovação exige uma justificativa textual obrigatória.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF004, RN003
### Histórias Relacionadas
- HU-008
### Casos de Uso Relacionados
- UC006
### Telas do Protótipo Relacionadas
- Painel do Administrador - Análise Documental
### Critérios de Pronto
- Interface de visualização e aprovação/reprovação de documentos desenhada.
### Critérios de Aceite
- Ao clicar em "Reprovar", um campo de justificativa se torna obrigatório.
- A ação só é concluída após o preenchimento da justificativa.

---

## FEATURE-008
### Nome
Upload e Controle de Edital Oficial (PDF)
### Objetivo
Aumentar a transparência e a segurança jurídica, vinculando o edital no sistema ao seu documento original do SEI.
### Descrição
O administrador da SMGA, ao criar um edital, deverá obrigatoriamente realizar o upload do arquivo PDF original gerado no SEI.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF016
### Histórias Relacionadas
- HU-005
### Casos de Uso Relacionados
- UC005
### Telas do Protótipo Relacionadas
- Formulário de Criação de Edital
### Critérios de Pronto
- Protótipo do formulário de criação de edital atualizado com o campo de upload.
### Critérios de Aceite
- O formulário de criação de edital possui um campo para upload de arquivo PDF.
- A publicação do edital é bloqueada se o PDF não for anexado.

---

## FEATURE-009
### Nome
Download do Edital Oficial (PDF)
### Objetivo
Permitir que os fornecedores consultem o documento completo e original do edital.
### Descrição
Na tela de detalhes do edital, o fornecedor deve ter acesso a um botão para baixar o arquivo PDF oficial que foi anexado pelo administrador.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF016
### Histórias Relacionadas
- HU-006
### Casos de Uso Relacionados
- UC015
### Telas do Protótipo Relacionadas
- Painel do Fornecedor - Detalhes do Edital
### Critérios de Pronto
- Feature de Upload (FEATURE-008) implementada.
### Critérios de Aceite
- A tela de detalhes do edital exibe um botão "Baixar Edital em PDF".
- Ao clicar no botão, o download do arquivo PDF correspondente é iniciado.

---

## FEATURE-010
### Nome
Solicitação de Desistência pelo Fornecedor
### Objetivo
Permitir que um fornecedor formalize sua intenção de sair de um processo de credenciamento.
### Descrição
O fornecedor deve poder clicar em um botão "Desistir" em um edital do qual participa. A ação não é automática e deve gerar uma pendência para o administrador.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF017, RN010
### Histórias Relacionadas
- HU-010
### Casos de Uso Relacionados
- UC016
### Telas do Protótipo Relacionadas
- Painel do Fornecedor - Detalhes do Edital
### Critérios de Pronto
- Protótipo da tela do fornecedor atualizado com o botão "Desistir".
### Critérios de Aceite
- Ao clicar em "Desistir" e confirmar, o status do fornecedor no edital muda para "Pendente de Desistência".
- Uma notificação é gerada para o painel do administrador.

---

## FEATURE-011
### Nome
Aprovação de Desistência pelo Administrador
### Objetivo
Garantir que a saída de um fornecedor seja um ato formal, com segurança jurídica e registro de auditoria.
### Descrição
O administrador da SMGA deve visualizar as solicitações de desistência em um painel de pendências e ter a ação de "Confirmar Desistência" para efetivar a saída do fornecedor.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF017, RN010
### Histórias Relacionadas
- HU-011
### Casos de Uso Relacionados
- UC014, UC016
### Telas do Protótipo Relacionadas
- Painel do Administrador - Pendências
### Critérios de Pronto
- Feature de Solicitação de Desistência (FEATURE-010) implementada.
### Critérios de Aceite
- O painel do administrador exibe uma lista de solicitações de desistência pendentes.
- O administrador pode aprovar a desistência, opcionalmente adicionando uma observação.
- A aprovação altera o status do fornecedor para "Desistente" e aciona o cadastro de reserva, se aplicável.

---

## FEATURE-012
### Nome
Motor de Distribuição Inteligente
### Objetivo
Realizar o rateio matemático das cotas de fornecimento de forma justa e equitativa.
### Descrição
O sistema deve calcular a distribuição igualitária dos itens do edital entre os fornecedores credenciados, com a regra de que a cota individual não pode exceder a capacidade produtiva declarada pelo fornecedor.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF005, RN005
### Histórias Relacionadas
- HU-013
### Casos de Uso Relacionados
- UC008
### Telas do Protótipo Relacionadas
- Painel do Administrador - Distribuição de Edital
### Critérios de Pronto
- Algoritmo de distribuição e redistribuição de excedentes definido e validado.
### Critérios de Aceite
- O cálculo distribui as cotas igualmente.
- Se a cota de um fornecedor excede sua capacidade declarada, ele recebe o seu limite e o excedente é redistribuído entre os demais.

---

## FEATURE-013
### Nome
Bloqueio de Edição Manual de Cotas
### Objetivo
Garantir a isonomia e a soberania do algoritmo de distribuição, impedindo interferência humana.
### Descrição
Após o cálculo de distribuição ser executado, o resultado deve ser imutável. Nenhum usuário, incluindo administradores, poderá editar manualmente as cotas atribuídas.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RN009
### Histórias Relacionadas
- HU-014
### Casos de Uso Relacionados
- UC008
### Telas do Protótipo Relacionadas
- Painel do Administrador - Resultado da Distribuição
### Critérios de Pronto
- Feature do Motor de Distribuição (FEATURE-012) implementada.
### Critérios de Aceite
- A interface de resultado da distribuição não apresenta campos ou botões para edição das cotas.
- Qualquer tentativa de alteração (ex: via API) é bloqueada pelo sistema.

---

## FEATURE-014
### Nome
Ocultação do Rateio Global na Visão do Fornecedor
### Objetivo
Evitar conflitos e reclamações entre os fornecedores.
### Descrição
A tela de resultado da distribuição, na visão do fornecedor, deve mostrar apenas a cota que foi atribuída à sua própria empresa, omitindo os dados de quanto os concorrentes receberam.
### Prioridade
Must Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF005
### Histórias Relacionadas
- HU-015
### Casos de Uso Relacionados
- UC008
### Telas do Protótipo Relacionadas
- Painel do Fornecedor - Resultado da Distribuição
### Critérios de Pronto
- Protótipo da tela de resultado do fornecedor ajustado.
### Critérios de Aceite
- O fornecedor logado vê a demanda total do edital e a cota atribuída à sua empresa.
- A tela não exibe uma tabela comparativa com os demais participantes.

---

## FEATURE-015
### Nome
Portal Público de Transparência
### Objetivo
Oferecer à sociedade e aos gestores uma visão clara sobre os investimentos e o impacto do programa.
### Descrição
Uma página pública (Landing Page) deve exibir indicadores e gráficos sobre o programa, como valor total investido, número de empresas beneficiadas e segmentos atendidos.
### Prioridade
Should Have
### Origem
- Original
### Requisitos Relacionados
- RF010
### Histórias Relacionadas
- HU-019
### Casos de Uso Relacionados
- UC011
### Telas do Protótipo Relacionadas
- Landing Page Pública
### Critérios de Pronto
- Definição dos KPIs e gráficos a serem exibidos.
### Critérios de Aceite
- A página é acessível publicamente, sem necessidade de login.
- Exibe gráficos de Total Investido, Empresas Credenciadas e Segmentos Aquecidos.

---

## FEATURE-016
### Nome
Adequação da Identidade Visual (Landing Page)
### Objetivo
Garantir que a comunicação visual do projeto esteja alinhada com a identidade da Prefeitura.
### Descrição
Ajustar a Landing Page de transparência para que o título seja "Compra Mais Rio Branco", utilize as logomarcas oficiais da prefeitura e o e-mail de contato correto.
### Prioridade
Should Have
### Origem
- Validação 01
### Requisitos Relacionados
- RF010, RNF006
### Histórias Relacionadas
- HU-019
### Casos de Uso Relacionados
- UC011
### Telas do Protótipo Relacionadas
- Landing Page Pública
### Critérios de Pronto
- Arquivos de logo e paleta de cores da prefeitura disponíveis.
### Critérios de Aceite
- O título da página é "Compra Mais Rio Branco".
- As logos da prefeitura estão inseridas no layout.
- O e-mail de contato foi atualizado para o endereço oficial.

---

## FEATURE-017
### Nome
Geração de Malote SEI Otimizado
### Objetivo
Automatizar e otimizar a criação do dossiê documental para tramitação no SEI.
### Descrição
O sistema deve permitir que o administrador exporte todos os documentos de um fornecedor em um único arquivo PDF/ZIP, ordenado, comprimido e otimizado para não exceder o limite de tamanho do SEI.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF007, RNF002, RN008
### Histórias Relacionadas
- HU-017
### Casos de Uso Relacionados
- UC010
### Telas do Protótipo Relacionadas
- Painel do Administrador - Detalhes do Fornecedor
### Critérios de Pronto
- Limite de tamanho (MB) do SEI formalmente informado pela TI.
- Ordem dos documentos no malote definida.
### Critérios de Aceite
- O botão "Exportar Malote SEI" gera um arquivo único.
- O arquivo gerado segue a ordem: 1º CNPJ, 2º Identificação, 3º Anexos, 4º Certidões.
- O arquivo é comprimido para respeitar o limite de tamanho do SEI.

---

## FEATURE-018
### Nome
Dashboard Interno de Gestão
### Objetivo
Fornecer aos administradores uma visão consolidada das pendências operacionais para priorização de trabalho.
### Descrição
O painel administrativo deve apresentar um dashboard com métricas de cadastros pendentes, documentos em análise, editais abertos e solicitações de desistência pendentes.
### Prioridade
Should Have
### Origem
- Original, atualizado na Validação 01
### Requisitos Relacionados
- RF013
### Histórias Relacionadas
- HU-021
### Casos de Uso Relacionados
- UC014
### Telas do Protótipo Relacionadas
- Painel do Administrador
### Critérios de Pronto
- Definição de todos os indicadores a serem exibidos no dashboard.
### Critérios de Aceite
- O painel exibe cards com o número de: cadastros pendentes, documentos "Em Análise" e "Desistências Pendentes".
- Clicar em um card direciona o usuário para a respectiva lista de itens.

---

## FEATURE-019
### Nome
Trilha de Auditoria Imutável
### Objetivo
Garantir a segurança jurídica e a rastreabilidade de todas as ações críticas no sistema.
### Descrição
Todas as ações de alteração de status (aprovação, reprovação, distribuição, desistência) devem ser registradas em um log imutável, contendo quem, quando e o que foi alterado.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF014, RNF003
### Histórias Relacionadas
- HU-018
### Casos de Uso Relacionados
- UC012
### Telas do Protótipo Relacionadas
- Módulo de Auditoria
### Critérios de Pronto
- Modelo de dados do log de auditoria definido.
### Critérios de Aceite
- Uma reprovação de documento gera um registro de log com o ID do fiscal, data/hora e a justificativa.
- Uma confirmação de desistência gera um registro de log com os dados do administrador.

---

## FEATURE-020
### Nome
Gestão do Cadastro de Reserva
### Objetivo
Gerenciar a fila de espera de fornecedores que se credenciam após a distribuição inicial.
### Descrição
O sistema deve alocar automaticamente fornecedores credenciados tardiamente em uma fila de espera (Cadastro de Reserva). Esta fila será acionada caso um fornecedor principal desista ou seja desclassificado.
### Prioridade
Must Have
### Origem
- Original
### Requisitos Relacionados
- RF006, RN004
### Histórias Relacionadas
- HU-016
### Casos de Uso Relacionados
- UC009
### Telas do Protótipo Relacionadas
- Painel do Administrador - Cadastro de Reserva
### Critérios de Pronto
- Lógica da fila FIFO (First-In, First-Out) definida.
### Critérios de Aceite
- Fornecedor credenciado após a distribuição é alocado no Cadastro de Reserva.
- A ordem da fila é estritamente cronológica.
- O sistema permite ao administrador convocar o próximo da fila para assumir uma cota vaga.
---

# Resumo das Alterações da V2

## Itens Mantidos
- **Cadastro Integrado (Receita Federal):** A funcionalidade principal permanece a mesma.
- **Repositório Documental Reutilizável:** O conceito de reuso de documentos foi mantido.
- **Filtro de Editais por CNAE:** A regra de negócio foi confirmada e mantida.
- **Covalidação Humana de Documentos:** O fluxo de análise manual com justificativa foi mantido.
- **Geração de Malote SEI Otimizado:** A necessidade e a estrutura do malote foram confirmadas.
- **Trilha de Auditoria Imutável:** A necessidade de logs para conformidade foi mantida.

## Itens Atualizados
- **Verificação de Inadimplência:** Atualizado para incluir a **Revisão da Nomenclatura de Status** (FEATURE-005), diferenciando "Bloqueado" de "Em Análise".
- **Motor de Distribuição Inteligente:** Atualizado para incluir o **Bloqueio de Edição Manual de Cotas** (FEATURE-013) e a **Ocultação do Rateio Global** (FEATURE-014).
- **Portal Público de Transparência:** Atualizado para incluir a **Adequação da Identidade Visual** (FEATURE-016) conforme solicitado pelo cliente.
- **Dashboard Interno de Gestão:** Atualizado para incluir a gestão de pendências do novo fluxo de desistência.

## Itens Novos
- **Termo de Responsabilidade Legal (FEATURE-004):** Novo requisito para aumentar a segurança jurídica.
- **Upload e Controle de Edital Oficial (PDF) (FEATURE-008):** Novo requisito para aumentar a transparência.
- **Download do Edital Oficial (PDF) (FEATURE-009):** Consequência do requisito de upload.
- **Solicitação de Desistência pelo Fornecedor (FEATURE-010):** Novo fluxo para formalizar a saída de um edital.
- **Aprovação de Desistência pelo Administrador (FEATURE-011):** Contraparte administrativa do fluxo de desistência.

## Itens Repriorizados
- **Biometria Facial (HU-012 / UC007):** Funcionalidade de alta complexidade que foi formalmente **adiada** para uma versão futura (pós-MVP) para não comprometer o cronograma de entrega.

## Itens Dependentes
- **Download do Edital (FEATURE-009)** depende da implementação do **Upload do Edital (FEATURE-008)**.
- **Aprovação de Desistência (FEATURE-011)** depende da **Solicitação de Desistência (FEATURE-010)**.
- **Verificação de Inadimplência (FEATURE-002)** depende da disponibilização e mapeamento técnico das APIs da PGM e outras bases de débito.

---

# Roadmap MVP Atualizado

## Fase 1 – MVP Obrigatório
Corresponde ao mínimo viável para a operação de credenciamento, garantindo segurança jurídica e isonomia.
- **Todas as Features com prioridade "Must Have":**
  - FEATURE-001: Cadastro Integrado (Receita Federal)
  - FEATURE-002: Verificação de Inadimplência
  - FEATURE-003: Repositório Documental Reutilizável
  - FEATURE-004: Termo de Responsabilidade Legal
  - FEATURE-005: Revisão da Nomenclatura de Status
  - FEATURE-006: Filtro de Editais por CNAE
  - FEATURE-007: Covalidação Humana de Documentos
  - FEATURE-008: Upload e Controle de Edital Oficial (PDF)
  - FEATURE-009: Download do Edital Oficial (PDF)
  - FEATURE-010: Solicitação de Desistência pelo Fornecedor
  - FEATURE-011: Aprovação de Desistência pelo Administrador
  - FEATURE-012: Motor de Distribuição Inteligente
  - FEATURE-013: Bloqueio de Edição Manual de Cotas
  - FEATURE-014: Ocultação do Rateio Global
  - FEATURE-017: Geração de Malote SEI Otimizado
  - FEATURE-019: Trilha de Auditoria Imutável

## Fase 2 – Melhorias Operacionais e de Gestão
Itens que melhoram a experiência de uso e a gestão do programa, mas não são impeditivos para o início da operação.
- **Todas as Features com prioridade "Should Have":**
  - FEATURE-015: Portal Público de Transparência
  - FEATURE-016: Adequação da Identidade Visual (Landing Page)
  - FEATURE-018: Dashboard Interno de Gestão

## Fase 3 – Evoluções Futuras
Funcionalidades de menor prioridade ou que dependem de maior complexidade técnica e validação.
- **Features com prioridade "Could Have" e Itens Adiados:**
  - **Notificações de Vencimento de Certidões (HU-020 / UC013):** Funcionalidade útil, mas não essencial para o MVP.
  - **Autenticação por Biometria Facial (HU-012 / UC007):** Funcionalidade de alto impacto técnico e de custo, formalmente adiada para o roadmap futuro.

## Itens que Dependem de Validação Técnica
- **Integração com API da PGM:** A feature de verificação de inadimplência (FEATURE-002) depende da liberação e mapeamento técnico da API de Dívida Ativa do município. Recomenda-se um plano de contingência (validação manual com upload de certidão) caso a API não esteja disponível a tempo para o MVP.