# Especificação de Feature: Onboarding B2G e Filtro por CNAE

**Feature Branch**: `001-onboarding-fornecedor-cnae`

**Created**: 2026-06-29

**Status**: Draft (atualizado 2026-06-29 — reconciliado com PRD v2.2, Constituição v2.0.0, contrato de UX e Arquitetura/31 ADs)

**Input**: Descrição do usuário: "Onboarding B2G + CNAE — Cadastro do fornecedor via CNPJ
com captura automática na Receita Federal, upload documental reutilizável e filtro
bloqueador de editais por CNAE compatível. Base de todo o fluxo (RF001, RF002, RF003)."

## Visão Geral

Este é o ponto de entrada do fornecedor local (MEI, ME, médias e grandes empresas) na
plataforma Compra Mais. A feature permite que o fornecedor se cadastre de forma autônoma a
partir do seu CNPJ, tenha seus dados cadastrais preenchidos automaticamente a partir de base
oficial, monte um repositório de documentos reutilizável entre editais e visualize apenas as
oportunidades compatíveis com sua área de atuação (CNAE). Não cobre habilitação documental
(covalidação antifraude), verificação de inadimplência ou distribuição — esses fluxos são
features subsequentes.

## Clarifications

### Session 2026-06-29

- Q: Em que nível o CNAE do fornecedor é compatível com o exigido pelo edital? → A: Match **exato por subclasse (7 dígitos)** — o edital lista subclasses exigidas e o fornecedor é compatível se qualquer CNAE válido (principal ou secundário) bater exatamente.
- Q: Como o vínculo Procurador ↔ empresa é criado e ativado? → A: O **titular** (responsável legal) cadastra-se primeiro e **convida/adiciona** (e pode remover) os procuradores que agem em nome da empresa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autocadastro do fornecedor via CNPJ (Priority: P1)

Um empresário local acessa o portal público, informa o CNPJ da sua empresa e o sistema
preenche automaticamente os dados cadastrais (razão social, porte, CNAE principal e
secundários) a partir de base oficial. Ele confere os dados, completa contato e dados de
responsável legal e cria sua conta de acesso. A partir daí passa a ter um cadastro de
fornecedor ativo na plataforma.

**Why this priority**: Sem o cadastro não existe nenhum outro fluxo. É a porta de entrada que
substitui o trâmite físico de papel e a maior alavanca para reduzir erro manual e barreira de
acesso. Entrega valor isolado: um fornecedor passa a existir digitalmente na plataforma.

**Independent Test**: Pode ser testado de ponta a ponta informando um CNPJ válido e
verificando que os dados oficiais são recuperados, exibidos para conferência e persistidos em
um cadastro de fornecedor acessível por login. Inclui o caminho de contingência (base oficial
indisponível → preenchimento manual).

**Acceptance Scenarios**:

1. **Given** um visitante no portal de cadastro, **When** ele informa um CNPJ ativo e válido,
   **Then** o sistema recupera e exibe razão social, porte e lista de CNAEs (principal e
   secundários) para conferência antes da confirmação.
2. **Given** os dados oficiais exibidos para conferência, **When** o fornecedor confirma e
   define seus dados de contato e credenciais de acesso, **Then** o sistema cria um cadastro de
   fornecedor ativo vinculado ao CNPJ e permite login subsequente.
3. **Given** a base oficial da Receita Federal indisponível no momento da consulta, **When** o
   fornecedor informa o CNPJ, **Then** o sistema permite o preenchimento manual dos dados
   cadastrais e registra que a origem dos dados foi manual (pendente de validação posterior).
4. **Given** um CNPJ já cadastrado na plataforma, **When** alguém tenta cadastrá-lo novamente,
   **Then** o sistema impede a duplicidade e orienta o uso de recuperação de acesso.
5. **Given** um CNPJ informado em formato inválido ou inexistente na base oficial, **When** a
   consulta é realizada, **Then** o sistema exibe mensagem clara de impedimento e não cria
   cadastro.

---

### User Story 2 - Visualização de editais filtrada por CNAE (Priority: P2)

Um fornecedor cadastrado acessa a lista de editais abertos e enxerga exclusivamente as
oportunidades compatíveis com seus CNAEs válidos, evitando "caça a editais" no Diário Oficial e
impedindo adesão a demandas fora do seu escopo legal de atuação.

**Why this priority**: É o principal valor percebido pelo fornecedor após o cadastro — acabar
com a leitura diária do Diário Oficial — e é uma trava legal (impedir atuação fora do CNAE).
Depende do cadastro (US1), por isso P2.

**Independent Test**: Com fornecedores de CNAEs distintos cadastrados e um conjunto de editais
com exigências de CNAE variadas, verificar que cada fornecedor vê apenas os editais
compatíveis e não consegue acessar/aderir aos incompatíveis.

**Acceptance Scenarios**:

1. **Given** um fornecedor com CNAE compatível a um edital aberto, **When** ele lista os
   editais, **Then** o edital compatível aparece na sua lista.
2. **Given** um fornecedor sem nenhum CNAE compatível a um edital, **When** ele lista os
   editais, **Then** esse edital não é exibido nem acessível por link direto.
3. **Given** um edital compatível com um CNAE secundário do fornecedor, **When** ele lista os
   editais, **Then** o edital é exibido (a compatibilidade considera CNAE principal e
   secundários).
4. **Given** um fornecedor sem nenhum edital compatível no momento, **When** ele acessa a lista,
   **Then** o sistema exibe estado vazio orientando que será notificado quando surgirem
   oportunidades do seu segmento.

---

### User Story 3 - Repositório documental reutilizável (Priority: P3)

Um fornecedor faz upload dos seus documentos (ex.: contrato social, certidões) uma única vez,
em um repositório pessoal, e os reaproveita em múltiplos editais enquanto estiverem dentro da
validade, sem precisar reenviar a cada nova oportunidade.

**Why this priority**: Elimina o retrabalho de reenviar a mesma papelada a cada edital — dor
central tanto do fornecedor quanto da CPL. Agrega valor ao cadastro, mas a habilitação
(aprovação) é feita em feature posterior, então P3.

**Independent Test**: Fazer upload de um documento com data de validade, confirmar que ele fica
disponível no repositório do fornecedor, reaproveitável em mais de um edital, e que documentos
vencidos são sinalizados como expirados.

**Acceptance Scenarios**:

1. **Given** um fornecedor cadastrado, **When** ele envia um documento em formato suportado
   informando o tipo e a data de validade, **Then** o documento é armazenado no seu repositório
   e fica disponível para uso em editais.
2. **Given** um documento já presente no repositório dentro da validade, **When** o fornecedor
   participa de um novo edital que o exige, **Then** o documento pode ser reaproveitado sem novo
   upload.
3. **Given** um documento cuja data de validade já passou, **When** o fornecedor consulta seu
   repositório, **Then** o documento é sinalizado como expirado e não é oferecido para
   reaproveitamento.
4. **Given** um upload em formato ou tamanho não suportado, **When** o fornecedor tenta enviar,
   **Then** o sistema recusa o arquivo com mensagem clara sobre formatos e limites aceitos.

---

### Edge Cases

- CNPJ válido na Receita mas com situação cadastral não ativa (baixado, inapto, suspenso) — o
  sistema deve sinalizar a situação e impedir o cadastro como fornecedor apto.
- Empresa com lista extensa de CNAEs secundários — a compatibilidade deve considerar todos sem
  degradar a experiência da lista de editais.
- Atualização de CNAE na Receita após o cadastro — o sistema deve permitir reconsultar/atualizar
  os CNAEs do fornecedor, refletindo na visibilidade dos editais.
- Tentativa de acesso a um edital incompatível por URL direta (não apenas pela lista) — deve ser
  bloqueada.
- Documento enviado sem data de validade (ex.: contrato social) — deve ser tratado como sem
  expiração, e não como expirado.
- Conta de fornecedor com múltiplos responsáveis/operadores pela mesma empresa — definir como o
  acesso à conta da empresa é compartilhado (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir o cadastro de fornecedor a partir do CNPJ, recuperando
  automaticamente de base oficial razão social, porte e CNAEs (principal e secundários). *(RF001)*
- **FR-002**: O sistema MUST exibir os dados recuperados para conferência do fornecedor antes de
  efetivar o cadastro.
- **FR-003**: O sistema MUST permitir o preenchimento manual dos dados cadastrais quando a base
  oficial estiver indisponível, registrando a origem manual dos dados para validação posterior.
  *(Critério de aceite RF001)*
- **FR-004**: O sistema MUST impedir o cadastro duplicado de um mesmo CNPJ e orientar o caminho
  de recuperação de acesso.
- **FR-005**: O sistema MUST recusar CNPJ inválido, inexistente ou com situação cadastral não
  apta, com mensagem clara de impedimento.
- **FR-006**: O sistema MUST permitir que o fornecedor crie credenciais de acesso e autentique-se
  para retornar à plataforma.
- **FR-007**: O sistema MUST permitir o upload de documentos do fornecedor em formatos suportados
  (PDF, JPG, PNG), armazenando-os em um repositório pessoal reutilizável entre editais. *(RF002)*
- **FR-008**: O sistema MUST permitir que o fornecedor informe o tipo e a data de validade de cada
  documento e MUST sinalizar como expirados os documentos fora da validade, excluindo-os do
  reaproveitamento. *(RF002)*
- **FR-009**: O sistema MUST exibir ao fornecedor exclusivamente os editais compatíveis com seus
  CNAEs válidos (principal ou secundário), ocultando e bloqueando o acesso aos incompatíveis,
  inclusive por link direto. A compatibilidade é por **match exato de subclasse CNAE (7
  dígitos)**: o edital lista uma ou mais subclasses exigidas e o fornecedor é compatível se
  qualquer CNAE válido bater exatamente. *(RF003, RN001)*
- **FR-010**: O sistema MUST permitir ao fornecedor **re-sincronizar** seus dados a partir da
  base oficial sob demanda ("Sincronizar agora"), registrando data/hora, origem e status da
  última sincronização; mudanças de CNAE refletem na visibilidade dos editais. *(RF018)*
- **FR-011**: O sistema MUST registrar trilha de auditoria das ações de cadastro, atualização
  cadastral e upload documental, contendo identificação do ator, evento, data/hora e origem. *(RNF003)*
- **FR-012**: O sistema MUST capturar o endereço do fornecedor de forma estruturada para permitir
  análise territorial de fomento local na camada de transparência. *(suporte a georreferenciamento)*
- **FR-013**: O sistema MUST tratar os dados originados da base oficial (razão social, porte,
  CNAE) como **somente leitura**; apenas Nome Fantasia, Endereço e Telefone são editáveis pelo
  fornecedor, e os campos oficiais só mudam por re-sincronização (FR-010). *(RN009)*
- **FR-014**: O sistema MUST suportar o papel **Procurador**, que age em nome da empresa; toda
  ação de um procurador MUST registrar na trilha o ator e a empresa representada, e direitos do
  titular que exijam o próprio titular NÃO são exercíveis por procurador. O vínculo
  Procurador↔empresa é estabelecido pelo **titular**, que se cadastra primeiro e convida/adiciona
  ou remove procuradores. *(papel Procurador)*
- **FR-015**: O sistema MUST capturar o **consentimento LGPD** (finalidade + data/hora) antes de
  tratar dados pessoais e MUST cifrar dados pessoais de sócios/procuradores em repouso e em
  trânsito. *(Constituição: Princípio V; RF017-consentimento)*

### Key Entities *(include if feature involves data)*

- **Fornecedor**: empresa local identificada pelo CNPJ. Atributos principais: razão social,
  porte, situação cadastral, endereço estruturado (com localização geográfica), origem dos dados
  (oficial/manual). Relaciona-se 1:N com CNAE, 1:N com Documento e 1:N com Conta de Acesso.
- **CNAE do Fornecedor**: código de atividade econômica associado ao fornecedor, com indicação de
  principal ou secundário e de validade/ativação. Base da compatibilidade com editais.
- **Documento**: arquivo de habilitação no repositório do fornecedor. Atributos: tipo, data de
  validade (opcional), situação (vigente/expirado), origem. Reutilizável entre editais.
- **Conta de Acesso**: credenciais e responsável que operam em nome do fornecedor.
- **Edital (referência externa)**: oportunidade publicada por uma secretaria, com exigência de
  CNAE compatível; nesta feature é consumido apenas como alvo do filtro de visibilidade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um fornecedor consegue concluir o autocadastro (do CNPJ ao cadastro ativo) em menos
  de 5 minutos, sem atendimento presencial.
- **SC-002**: Em pelo menos 95% dos cadastros com CNPJ ativo, os dados cadastrais (razão social,
  porte, CNAEs) são preenchidos automaticamente sem digitação manual.
- **SC-003**: 100% dos editais exibidos a um fornecedor são compatíveis com seus CNAEs, e nenhum
  edital incompatível é acessível (por lista ou link direto).
- **SC-004**: Um documento dentro da validade é reaproveitado em mais de um edital sem reenvio em
  100% dos casos.
- **SC-005**: O cadastro permanece concluível mesmo com a base oficial indisponível, via
  preenchimento manual, sem bloquear a entrada do fornecedor.
- **SC-006**: 100% das ações de cadastro, atualização cadastral e upload geram registro de
  auditoria consultável.

## Assumptions

- A autenticação fica atrás de um provedor de identidade plugável: credenciais próprias
  (identificador + senha) no MVP, com gov.br/SSO como evolução sem reescrita; verificação
  biométrica/facial está fora do escopo do MVP (Won't Have).
- A plataforma é Web responsiva (acesso via navegador, inclusive mobile); não há aplicativo nativo
  no escopo desta feature.
- A base oficial consultada para dados de CNPJ/CNAE é a Receita Federal; verificação de
  inadimplência (PGM/SICAF) e covalidação documental NÃO fazem parte desta feature.
- A compatibilidade de CNAE é por **match exato de subclasse (7 dígitos)** entre os CNAEs válidos
  do fornecedor (principal e secundários) e as subclasses exigidas pelo edital (ver Clarifications).
- A conta da empresa tem um responsável legal (titular) que se cadastra primeiro e convida/remove
  um ou mais **Procuradores** que agem em seu nome (FR-014), com rastro de ator na auditoria;
  direitos LGPD que exigem o titular não são exercíveis por procurador.
- Documentos sem data de validade (ex.: contrato social) são tratados como sem expiração.
- O endereço do fornecedor é capturado para fins de transparência territorial; o detalhamento do
  uso geoespacial (mapas/agregações) é responsabilidade da feature de Transparência.

## Out of Scope

- Verificação de inadimplência e bloqueio de credenciamento (PGM/SICAF/bases federais e estaduais).
- Covalidação humana antifraude e aprovação/reprovação de documentos.
- Motor de distribuição e fila de Segunda Demanda.
- Geração de malote SEI.
- Notificações de vencimento de certidões por e-mail/SMS (consumidoras deste cadastro, em feature
  posterior).
