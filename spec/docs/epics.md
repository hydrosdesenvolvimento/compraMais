---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - spec/docs/prd.md
  - spec/docs/architecture/ARCHITECTURE-SPINE.md
  - spec/Prototipo/portal-fornecedor.html
  - spec/Prototipo/painel-administrativo.html
  - spec/Prototipo/index.html
  - spec/docs/plano-releases.md
  - spec/docs/matriz-lacunas.md
  - spec/source/05-HistoriasUsuario.md
  - source/06-CasosUso.md
---

# Compra Mais - Epic Breakdown

## Overview

Decomposição de épicos e histórias do Compra Mais a partir do PRD (v2.2), da Espinha de Arquitetura (33 ADs), do **contrato de UX** (DESIGN/EXPERIENCE, ratificado) e do plano de releases (3 ondas). Run regenerada do zero com o contrato de UX presente — UX-DRs são requisitos de primeira classe.

> Atualizado para PRD v2.5 / 41 ADs — Validação 01 incorporada (ver seção "Cobertura da Validação 01" e [VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md)).

## Requirements Inventory

### Functional Requirements

```
FR001: Cadastro B2G via CNPJ com autopreenchimento (Receita); fallback manual covalidado se a API estiver indisponível.
FR002: Upload documental (PDF/JPG/PNG) em repositório reutilizável até expiração; cifrado em repouso.
FR003: Filtro de editais por compatibilidade de CNAE (esconde incompatíveis).
FR004: Covalidação humana (aprovar/reprovar) com justificativa obrigatória na reprovação.
FR005: Motor de distribuição — water-filling iterativo + maiores restos (Hamilton) + desempate determinístico.
FR006: Cadastro de Reserva / Segunda Demanda com ciclo de vida (gatilho, promoção ordenada, substituição).
FR007: Geração de malote ordenado (CNPJ→Doc→Anexos→Certidões) com fragmentação parametrizável.
FR008: Criação de editais individualizados (1 edital = 1 secretaria).
FR009: Notificações de vencimento (e-mail/SMS). [Release 2]
FR010: Portal público de transparência. [Release 2/3]
FR011: Verificação de inadimplência (PGM/SICAF/bases) com bloqueio transitório.
FR012: Biometria facial (liveness) — REMOVIDA do MVP; condicional Release 2 com RIPD.
FR013: Dashboard administrativo (funil de cadastros pendentes, status).
FR014: Trilha de auditoria com consulta filtrada e exportação CSV/JSON.
FR015: Autenticação recorrente (login, reset de senha, provedor plugável; MFA quando aplicável).
FR016: Tela única de contestação/regularização (correção de CNAE, recurso de reprovação, regularização fiscal).
FR017: Gestão de consentimento e direitos do titular LGPD (acesso, correção, exclusão).
FR018: Re-sincronização dos dados do CNPJ sob demanda (re-consulta à Receita, com timestamp e status). [NOVO — design Minha conta]
```

### NonFunctional Requirements

```
NFR001 (RNF001): Integrações via adaptadores ACL + circuit breaker + degradação graciosa; Pact + mocks.
NFR002 (RNF002): Compressão + fragmentação do malote; limite SEI como parâmetro de config; comprimir→split→rejeitar.
NFR003 (RNF003): Trilha de auditoria em JSON imutável (usuário, evento, timestamp, IP, payload).
NFR004 (RNF004): Conformidade Lei 14.133/21 (art.79), Lei 2.027, TCE (preferência "por item").
NFR005 (RNF005): Disponibilidade com SLA numérico (a ratificar); credenciamento contínuo.
NFR006 (RNF006): Identidade visual e acessibilidade conforme o contrato de UX — DESIGN.md/EXPERIENCE.md + bundles de `../Prototipo/` (Poppins, e-MAG/WCAG 2.1 AA; paleta em arbitragem 0.7).
NFR007 (RNF007): LGPD — base legal, cifra repouso/trânsito, retenção/descarte, RIPD, DPO, acordos Art.26.
NFR008 (RNF008): Determinismo/reprodutibilidade do motor.
```

### Additional Requirements

Da Espinha de Arquitetura (33 ADs):

```
- STARTER/GREENFIELD (Épico 1, História 1): sem template único; Node.js 24 LTS + Express/Fastify (sem NestJS), React 19 + Vite + TS, PostgreSQL 18, object storage S3-compatível; monólito modular DDD (DI/fronteiras por convenção do time).
- AD-1/AD-29: módulos DDD + CI/CD + ambientes dev/staging/prod + secret manager + backup.
- AD-4/AD-26: adaptador ACL por integração + circuit breaker (Opossum) + idempotencyKey + Pact/mocks.
- AD-23: contrato canônico de evento de domínio (envelope + catálogo shared/events/; fato não ordem; eventVersion imutável).
- AD-7/AD-8/AD-24: motor função pura determinística; regra de resto/desempate = parâmetro versionado/logado; serialização canônica.
- AD-10/AD-25: alocação append-only; substituição = SubstituicaoCota; ordem da Reserva = regra_reserva_vN.
- AD-11/AD-12/AD-27: inadimplência reavaliada em cada porta; default fail-open + flag; reavaliação registra fato.
- AD-13/14/15/16/17: dono único por entidade; máquina de fase via evento; status Documento só pela Covalidação; Edital→1 Secretaria; escrita única.
- AD-18/AD-28: auditoria append-only escritor único consumindo eventos; migrações forward-only sem mutar a trilha.
- AD-19/AD-20: LGPD (cifra, retenção, direitos); identidade plugável (credenciais locais MVP).
- AD-21: malote worker assíncrono, ordenação determinística, fragmentação.
- AD-22: observabilidade das integrações.
- AD-3: dois bundles SPA com design system + IA do contrato de UX.
- AD-30 [NOVO]: papel Procurador (sub-papel de fornecedor); ação registra ator + empresa representada; liga antifraude.
- AD-31 [NOVO]: dados originados na Receita read-only; só Nome Fantasia/Endereço/Telefone editáveis; mudam por re-sync (RF018).
- QUESTÃO ABERTA BLOQUEANTE: Item × Lote — fechar antes de congelar o motor.
- Parâmetros a ratificar: default do desempate, default da política de indisponibilidade, retenção LGPD, limite MB do SEI.
```

Regras de negócio (PRD §9): RN001–RN008 + **RN009 (dados Receita read-only)**.

### UX Design Requirements

Do contrato de UX — metade escrita ([DESIGN.md](ux/DESIGN.md) + [EXPERIENCE.md](ux/EXPERIENCE.md)) + metade artefato ([`../Prototipo/`](../Prototipo/)), ambas normativas (AD-39):

```
UX-DR1: Design system compartilhado entre os 2 SPAs — Poppins, âmbar #FFB300 (ação), raio 8px/999px, espaçamento 8/12/14/16/20. ⚠️ PALETA EM ARBITRAGEM (0.7): brandbook oficial #0061AE/#003A68 × navy #0A2A52/#0E3A6E/#14467F (bundles + implementação). Decisão da Prefeitura.
UX-DR2: AuthPanel — painel dividido (institucional + autenticação); toggle Entrar/Criar conta; CNPJ + Consultar; estado de fallback "Receita indisponível? Preencher manualmente" visível.
UX-DR3: Vitrine de editais filtrada por CNAE (esconde incompatíveis).
UX-DR4: "Minha conta" — dados oficiais da Receita read-only; "Sincronizar agora" com timestamp/status; campos editáveis = Nome Fantasia/Endereço/Telefone.
UX-DR5: IA de navegação — sidebar (Início, Editais, Meus credenciamentos, Documentos, Demandas distribuídas) + top bar (busca, notificações, menu usuário + papel).
UX-DR6: Início/dashboard — saudação + CTAs de ação pendente (Regularizar agora, Atualizar documento, Ver notificações).
UX-DR7: Componentes — botões (primário/secundário/terciário/desabilitado), cards, labels/tags por status (Ativa/Pendente/Bloqueado), barra de acessibilidade.
UX-DR8: Acessibilidade e-MAG/WCAG 2.1 AA — foco visível âmbar (3px), alto contraste, navegação por teclado, ajuste de fonte.
UX-DR9: Estados visíveis — fallback manual; sincronização (sucesso/erro); bloqueio (Regularizar agora); documento (Pendente/Aprovado/Reprovado com motivo).
UX-DR10: Painel Admin e Portal Público herdam o design system (telas a derivar quando priorizadas).
DECISÕES ABERTAS: LAYOUT A vs B do login; cor azul oficial (brandbook).
```

### FR Coverage Map

```
RF001→E1 · RF002→E2 · RF003→E3 · RF004→E2 · RF005→E5 · RF006→E5 · RF007→E6 · RF008→E3
RF009→[R2] · RF010→E9 · RF011→E4 · RF012→[R2] · RF013→E9 · RF014→E8 · RF015→E1
RF016→E7 · RF017→E7 · RF018→E1
RF024→E2 · RF025→E3 · RF026→E5
UX-DR1/2/4/7/8→E1 · UX-DR3→E3 · UX-DR9→E4 · UX-DR6→E7 · UX-DR5/10→E9
```

## Epic List

### Épico 1: Fundação Técnica + Onboarding do Fornecedor
Base técnica + auditoria-fundação; fornecedor cadastra via CNPJ (autopreenchido), autentica, consente (LGPD), re-sincroniza dados e age por papel (titular/Procurador).
**FRs covered:** RF001, RF015, RF018 *(RF017-consentimento; AD-1/29/30/31; RN009)*

### Épico 2: Habilitação Documental e Covalidação Antifraude
Documentos reutilizáveis cifrados; CPL aprova/reprova com justificativa; micro-fluxo de recurso.
**FRs covered:** RF002, RF004 *(AD-15/18/19)*

### Épico 3: Editais Individualizados e Vitrine por CNAE
Editais 1=1 secretaria; vitrine filtrada por CNAE; micro-fluxo de correção de CNAE.
**FRs covered:** RF008, RF003 *(AD-16; UX-DR3)*

### Épico 4: Elegibilidade Fiscal e Bloqueio Transitório
Inadimplência com bloqueio transitório (fail-open + flag); micro-fluxo de regularização.
**FRs covered:** RF011 *(AD-11/12/27; UX-DR9)*

### Épico 5: Motor de Distribuição e Cadastro de Reserva ⚠️
Distribuição determinística + Reserva + substituição. **Bloqueado** até ratificar Item × Lote.
**FRs covered:** RF005, RF006 *(AD-7/8/9/10/24/25)*

### Épico 6: Malote SEI
Dossiê ordenado, comprimido, fragmentável; upload manual no MVP.
**FRs covered:** RF007 *(AD-6/21/26)*

### Épico 7: Tela Única de Contestação e Direitos do Titular
Consolida recurso/correção/regularização (E2/E3/E4) + direitos LGPD.
**FRs covered:** RF016, RF017 *(LAC-11; AD-19; UX-DR6)*

### Épico 8: Auditoria — Consulta e Exportação
Trilha consultável e exportável para o TCE.
**FRs covered:** RF014 *(AD-18/28)*

### Épico 9: Painéis — Admin e Transparência Pública
Dashboard administrativo + portal público; herdam o design system.
**FRs covered:** RF013, RF010 *(AD-3; UX-DR5/10)*

> **Fora do MVP:** RF009 (notificações — R2), RF012 (biometria — R2 condicional).
> **Pré-condição bloqueante do Épico 5:** fechar Item × Lote com SMGA/TCE.
> **Contestação:** micro-fluxos em E2/E3/E4; consolidação no E7.

## Épico 1: Fundação Técnica + Onboarding do Fornecedor

### Story 1.1: Scaffold do monólito modular e pipeline de entrega
As a equipe de desenvolvimento,
I want um esqueleto Node.js 24 LTS (Express/Fastify, sem NestJS) / React 19 + Vite / PostgreSQL 18 com módulos DDD e CI/CD por ambiente,
So that toda história assente numa fundação consistente (AD-1, AD-29).

**Acceptance Criteria:**
**Given** o repositório vazio,
**When** o scaffold é aplicado,
**Then** existem os módulos `catalogo, credenciamento, editais, distribuicao, malote, auditoria, transparencia, shared/acl, shared/identity` com fronteiras internas,
**And** o CI roda build → testes → Pact em dev/staging/prod isolados, com segredos fora do repo.

### Story 1.2: Fundação de auditoria append-only e barramento de eventos
As a órgão de controle,
I want que toda ação emita um evento gravado numa trilha imutável,
So that exista rastro irrefutável desde o primeiro fluxo (AD-18, AD-23).

**Acceptance Criteria:**
**Given** o envelope canônico `{eventId, eventName, eventVersion, aggregateId, occurredAt, payload}`,
**When** um módulo emite um evento,
**Then** o módulo Auditoria (escritor único) o persiste append-only,
**And** nenhum outro módulo escreve direto; schema emitido é imutável (nova eventVersion).

### Story 1.3: Cadastro via CNPJ com autopreenchimento e fallback manual
As a fornecedor local,
I want inserir só o CNPJ e ter meus dados preenchidos,
So that eu entre sem retrabalho (RF001, UX-DR2).

**Acceptance Criteria:**
**Given** o AuthPanel com campo CNPJ e botão "Consultar",
**When** consulto um CNPJ válido,
**Then** o adaptador da Receita (AD-4) preenche Razão Social, CNAE e Porte com proveniência `{fonte, timestamp, frescor}`,
**And** se a Receita estiver indisponível, o link "Preencher manualmente" fica visível e a entrada manual é marcada para covalidação.

### Story 1.4: Autenticação recorrente com provedor plugável
As a usuário (fornecedor ou servidor),
I want fazer login e recuperar senha,
So that eu acesse a plataforma de forma segura (RF015, AD-20).

**Acceptance Criteria:**
**Given** credenciais locais (default MVP) atrás do provedor plugável,
**When** autentico ou solicito reset,
**Then** o acesso respeita o RBAC do meu perfil,
**And** a abstração permite trocar para gov.br/SSO sem reescrever consumidores.

### Story 1.5: Consentimento LGPD e cifra de PII
As a titular de dados,
I want consentir o tratamento e ter dados cifrados,
So that meu cadastro respeite a LGPD (RF017-consentimento, AD-19).

**Acceptance Criteria:**
**Given** a tela de cadastro,
**When** concluo o consentimento,
**Then** finalidade + timestamp são registrados na trilha,
**And** PII de sócios é cifrada em repouso e em trânsito.

### Story 1.6: Re-sincronização do CNPJ e edição restrita
As a fornecedor,
I want re-sincronizar meus dados oficiais e editar só o que me cabe,
So that meus dados fiquem corretos sem adulterar o oficial (RF018, RN009, AD-31, UX-DR4).

**Acceptance Criteria:**
**Given** dados já preenchidos pela Receita na tela "Minha conta",
**When** aciono "Sincronizar agora",
**Then** o sistema re-consulta a Receita e grava `{timestamp, fonte, status}`,
**And** Razão Social, CNAE e Porte ficam somente leitura; só Nome Fantasia, Endereço e Telefone são editáveis.

### Story 1.7: Papel Procurador com rastro de ator
As a procurador de uma empresa,
I want agir em nome da empresa com meu vínculo registrado,
So that a ação seja autorizada e auditável (AD-30, RNF003).

**Acceptance Criteria:**
**Given** um usuário com papel `Procurador` vinculado a uma empresa,
**When** ele executa uma ação em nome da empresa,
**Then** a trilha registra o ator + a empresa representada,
**And** direitos do titular LGPD que exigem o próprio titular não são exercíveis pelo Procurador.

## Épico 2: Habilitação Documental e Covalidação Antifraude

### Story 2.1: Upload documental reutilizável e cifrado
As a fornecedor,
I want enviar documentos uma vez e reusá-los,
So that eu não reenvie o mesmo PDF a cada edital (RF002).

**Acceptance Criteria:**
**Given** um arquivo PDF/JPG/PNG válido,
**When** faço upload,
**Then** ele fica cifrado com status `Pendente`, reutilizável até a expiração,
**And** arquivo inválido ou acima do limite é rejeitado com mensagem clara.

### Story 2.2: Covalidação com justificativa obrigatória
As a servidor da CPL,
I want visualizar o PDF e aprovar/reprovar,
So that eu barre fraude com rastro (RF004, RN003, AD-15).

**Acceptance Criteria:**
**Given** um documento `Pendente`,
**When** reprovo,
**Then** o sistema exige justificativa e bloqueia a ação se estiver em branco,
**And** a transição só ocorre pelo módulo Covalidação e emite evento.

### Story 2.3: Recurso de reprovação (micro-fluxo de contestação)
As a fornecedor reprovado,
I want ver o motivo e reenviar,
So that eu não fique em beco sem saída (parte de RF016, UX-DR9).

**Acceptance Criteria:**
**Given** um documento `Reprovado` com motivo,
**When** acesso meu painel,
**Then** vejo o motivo e o CTA "Atualizar documento",
**And** o reenvio recoloca em `Pendente` e notifica a CPL.

## Épico 3: Editais Individualizados e Vitrine por CNAE

### Story 3.1: Criação de edital individualizado
As a servidor da CPL,
I want criar um edital vinculado a uma única secretaria,
So that cada demanda seja isolada (RF008, RN007, AD-16).

**Acceptance Criteria:**
**Given** a tela de criação,
**When** salvo,
**Then** o edital referencia exatamente uma secretaria (schema),
**And** o sistema impede segundo órgão ou lote compartilhado.

### Story 3.2: Vitrine filtrada por CNAE
As a fornecedor,
I want ver só editais compatíveis com meus CNAEs,
So that eu não perca tempo (RF003, RN001, UX-DR3).

**Acceptance Criteria:**
**Given** meus CNAEs,
**When** acesso a vitrine,
**Then** vejo só editais compatíveis,
**And** incompatíveis não aparecem.

### Story 3.3: Correção de CNAE (micro-fluxo de contestação)
As a fornecedor,
I want sinalizar e corrigir um CNAE errado,
So that eu não fique invisível (parte de RF016).

**Acceptance Criteria:**
**Given** um CNAE que considero incorreto,
**When** abro a correção,
**Then** registro a solicitação com evidência,
**And** ela entra em covalidação antes de mudar minha visibilidade.

## Épico 4: Elegibilidade Fiscal e Bloqueio Transitório

### Story 4.1: Adaptadores de dívida com resultado proveniente
As a sistema,
I want consultar PGM e bases via adaptadores ACL,
So that a verificação seja agnóstica e auditável (RF011, AD-4/5).

**Acceptance Criteria:**
**Given** o CNPJ,
**When** consulto débitos,
**Then** cada adaptador retorna `{valor, fonte, timestamp, frescor}`,
**And** o circuit breaker protege contra timeout e a consulta é idempotente.

### Story 4.2: Bloqueio transitório reavaliado em cada porta
As a CPL,
I want bloquear inadimplentes de forma transitória e reavaliada,
So that o bloqueio respeite o direito da ME/EPP (RF011, RN002, AD-11/12/27).

**Acceptance Criteria:**
**Given** um resultado de dívida,
**When** o fornecedor tenta avançar,
**Then** o bloqueio é reavaliado em cada porta, nunca permanente,
**And** com API indisponível aplica-se fail-open + flag para a CPL, registrando `ReavaliacaoPortaRegistrada`.

### Story 4.3: Regularização fiscal (micro-fluxo de contestação)
As a fornecedor bloqueado,
I want ver o motivo e regularizar,
So that eu volte a ser elegível ao quitar (parte de RF016, UX-DR9).

**Acceptance Criteria:**
**Given** um bloqueio por débito,
**When** acesso o Início,
**Then** vejo o aviso com CTA "Regularizar agora" (motivo + fonte + data),
**And** a reconsulta na próxima porta libera se o débito sumiu.

## Épico 5: Motor de Distribuição e Cadastro de Reserva ⚠️

> **Bloqueado:** não agendar antes de fechar Item × Lote (SMGA/TCE).

### Story 5.1: Motor de rateio puro e determinístico
As a CPL,
I want calcular a distribuição igualitária limitada à capacidade,
So that o rateio seja justo (RF005, RN005, AD-7/8).

**Acceptance Criteria:**
**Given** `{demanda, aptos+teto, regra_desempate}`,
**When** executo o motor,
**Then** ele roda water-filling iterativo + Hamilton sem relógio/random/leitura de DB,
**And** capacidade total < demanda emite alerta de déficit.

### Story 5.2: Persistência canônica e auditável da matriz
As a órgão de controle,
I want que cada distribuição seja reproduzível byte-a-byte,
So that eu possa reauditá-la (RF005, RNF008, AD-10/24).

**Acceptance Criteria:**
**Given** uma distribuição calculada,
**When** persistida,
**Then** grava matriz canônica + `regra_vN`+hash + sementes na trilha,
**And** é append-only (sem UPDATE) e a reexecução é bloqueada após contrato.

### Story 5.3: Cadastro de Reserva para retardatários
As a fornecedor tardio,
I want entrar numa fila de Reserva ordenada,
So that eu participe sem quebrar contratos (RF006, RN004, AD-25).

**Acceptance Criteria:**
**Given** um edital já distribuído,
**When** sou aprovado depois,
**Then** entro na Reserva com ordem `regra_reserva_vN` (default FIFO + menor CNPJ),
**And** as alocações existentes ficam intactas.

### Story 5.4: Substituição de desistente
As a CPL,
I want realocar a cota de um desistente ao primeiro da Reserva,
So that o fornecimento continue sem re-rodar o motor (RF006, AD-10).

**Acceptance Criteria:**
**Given** um titular que desiste,
**When** aciono a substituição,
**Then** registra-se `SubstituicaoCota` (novo registro) só da cota liberada,
**And** as demais alocações ficam intactas.

## Épico 6: Malote SEI

### Story 6.1: Geração assíncrona do malote ordenado
As a CPL,
I want gerar o dossiê na ordem legal,
So that eu elimine a organização manual (RF007, RN008, AD-6/21).

**Acceptance Criteria:**
**Given** documentos aprovados,
**When** aciono "gerar malote",
**Then** um worker consolida na ordem CNPJ→Doc→Anexos→Certidões e me notifica,
**And** a ordenação é contínua entre fragmentos.

### Story 6.2: Compressão e fragmentação por limite configurável
As a CPL,
I want que o malote caiba no limite do SEI,
So that a exportação não falhe (RNF002, AD-21).

**Acceptance Criteria:**
**Given** o limite do SEI como config,
**When** o malote excede,
**Then** aplica-se comprimir → split por página → fragmentar,
**And** PDF único irredutível é exceção explícita com aviso.

### Story 6.3: Exportação idempotente para upload manual
As a CPL,
I want baixar o malote para subir no SEI,
So that o processo seja formalizado no MVP (RF007, AD-26).

**Acceptance Criteria:**
**Given** um malote pronto,
**When** exporto,
**Then** recebo o arquivo final,
**And** repetir a exportação é idempotente (não duplica protocolo).

## Épico 7: Tela Única de Contestação e Direitos do Titular

### Story 7.1: Tela única de contestação consolidada
As a fornecedor,
I want um lugar único para recorrer, corrigir CNAE e regularizar,
So that eu acompanhe todas as pendências (RF016, UX-DR6).

**Acceptance Criteria:**
**Given** os micro-fluxos de E2/E3/E4,
**When** acesso a tela única,
**Then** vejo, como projeção, o estado e o próximo passo de cada pendência,
**And** cada ação delega ao módulo dono.

### Story 7.2: Direitos do titular — acesso e correção
As a titular,
I want ver e corrigir meus dados,
So that eu exerça meus direitos LGPD (RF017, AD-19).

**Acceptance Criteria:**
**Given** minha identidade autenticada (titular, não Procurador),
**When** solicito acesso/correção,
**Then** vejo meus dados e peço correção pelo ponto único,
**And** a solicitação é registrada na trilha.

### Story 7.3: Direito de exclusão e descarte por retenção
As a titular,
I want solicitar exclusão e ter dados expurgados ao fim da retenção,
So that meus dados não fiquem além do necessário (RF017, AD-19).

**Acceptance Criteria:**
**Given** a política de retenção como parâmetro,
**When** o prazo vence ou solicito exclusão,
**Then** o expurgo ocorre conforme a política,
**And** respeita obrigações legais de guarda e fica registrado.

## Épico 8: Auditoria — Consulta e Exportação

### Story 8.1: Consulta filtrada da trilha
As a órgão de controle,
I want consultar por usuário, data, ação e edital,
So that eu investigue qualquer evento (RF014).

**Acceptance Criteria:**
**Given** a trilha imutável,
**When** filtro,
**Then** vejo os eventos com payload,
**And** a consulta é somente leitura.

### Story 8.2: Exportação segura CSV/JSON
As a órgão de controle,
I want exportar os logs filtrados,
So that eu os entregue a auditorias (RF014, RNF003).

**Acceptance Criteria:**
**Given** um resultado de consulta,
**When** exporto,
**Then** recebo CSV/JSON íntegro,
**And** a exportação é registrada como evento.

## Épico 9: Painéis — Admin e Transparência Pública

### Story 9.1: Dashboard administrativo (funil de pendentes)
As a gestor SMGA/CPL,
I want um painel com cadastros pendentes e status,
So that eu acompanhe o fluxo (RF013, UX-DR5).

**Acceptance Criteria:**
**Given** dados de credenciamento,
**When** abro o dashboard,
**Then** vejo o funil de pendências e indicadores,
**And** respeita a segregação RBAC.

### Story 9.2: Portal público de transparência
As a cidadão/FIEAC,
I want ver volume investido, empresas e editais,
So that eu acompanhe a transparência (RF010, RNF006, AD-3).

**Acceptance Criteria:**
**Given** views de leitura otimizadas,
**When** acesso o portal público,
**Then** vejo indicadores na paleta azul institucional,
**And** é um bundle SPA separado, sem acesso direto a banco.

### Story 9.3: Design system compartilhado e acessível
As a usuário dos dois portais,
I want consistência visual e de interação conforme o contrato de UX,
So that a experiência seja coerente e acessível (UX-DR1/7/8/10, RNF006, AD-3).

> ✅ Contrato de UX: [DESIGN.md](ux/DESIGN.md) / [EXPERIENCE.md](ux/EXPERIENCE.md) + bundles de [`../Prototipo/`](../Prototipo/) (AD-39).

**Acceptance Criteria:**
**Given** os tokens de [DESIGN.md](ux/DESIGN.md) (Poppins; âmbar #FFB300; raio 8px/999px; espaçamento 8/12/14/16/20) e a **paleta que a arbitragem 0.7 definir**,
**When** os dois SPAs consomem o design system,
**Then** componentes (AuthPanel, sidebar, cards, labels/tags, botões, barra de acessibilidade) e paleta são consistentes,
**And** a acessibilidade atende e-MAG/WCAG 2.1 AA (foco visível âmbar 3px, alto contraste, teclado),
**And** a IA segue [EXPERIENCE.md](ux/EXPERIENCE.md) e os bundles (Início, Editais, Meus credenciamentos, Documentos, Demandas distribuídas).

> ⚠️ **Bloqueada pela arbitragem 0.7.** Esta história não é testável antes da Prefeitura decidir a paleta: o brandbook oficial diz `#0061AE`/`#003A68`, os bundles e a implementação dizem navy `#0A2A52`/`#0E3A6E`/`#14467F`.

---

## Refinamentos de Aceite — Convergência Spec-Kit → BMad (2026-07-02)

As decisões finas resolvidas nas features `spec/00X-*` (arquivadas em `../archive/2026-06-29-spec-kit/`) foram
resgatadas aqui como **critérios de aceite adicionais**, vinculados à história de destino. Cada item complementa
(não substitui) o AC da história. Rastreabilidade completa em [CONVERGENCIA.md](CONVERGENCIA.md).

### Story 1.3 — Cadastro via CNPJ *(resgate `spec/001`)*
- **Given** um CNPJ com situação cadastral **não ativa** (baixado/inapto/suspenso), **When** consulto, **Then** o sistema sinaliza a situação e **impede** o cadastro como fornecedor apto.
- **Given** um CNPJ **já cadastrado**, **When** alguém tenta cadastrá-lo de novo, **Then** a duplicidade é impedida e o sistema orienta a recuperação de acesso.
- **Given** um CNPJ em formato inválido ou inexistente na base, **When** consulto, **Then** mensagem clara de impedimento e nenhum cadastro criado.
- **Given** o cadastro do fornecedor (RF019), **When** informo o endereço, **Then** ele é capturado de forma **estruturada/geolocalizável** para análise territorial na Transparência.

### Story 1.7 — Papel Procurador *(resgate `spec/001`, RN010)*
- **Given** uma empresa cadastrada, **When** o **titular** convida um Procurador, **Then** o vínculo é criado por ele (e ele pode **remover**); Procurador não se autovincula.

### Story 2.2 — Covalidação *(resgate `spec/002`, RN011, AD-34)*
- **Given** documentos pendentes, **When** a CPL acessa a fila, **Then** vê a **fila pendente e o tempo decorrido por documento**, **sem** SLA/prazo fixo bloqueante.
- **Given** a listagem `GET .../documentos/pendentes`, **When** filtro, **Then** aceita **probe parcial** (status, tipo) de `Documento` (QBE); agregações e recurso único **não** recebem QBE.

### Story 3.1 / 3.3 — Editais e contestação *(resgate `spec/003`, RN012)*
- **Given** um edital **Publicado**, **When** a Secretaria/Gestor altera qualquer campo (inclusive CNAE/quantitativos), **Then** a mudança é permitida **com registro antes/depois** na trilha; mudança de CNAE **reavalia a vitrine imediatamente** mantendo o prazo original (reabertura de prazo é decisão manual auditada).
- **Given** um edital, **When** **qualquer** fornecedor cadastrado e ativo contesta o CNAE, **Then** a contestação é aceita e julgada (acatar/recusar com justificativa) pela Secretaria/CPL.

### Story 4.2 — Bloqueio transitório *(resgate `spec/002`, RN002)*
- **Given** uma penalidade/inidoneidade, **When** avalio o prazo, **Then** uso a **data da base oficial** quando disponível; senão a **CPL registra manualmente** o termo (híbrido).

### Story 6.1 / 6.2 — Malote *(resgate `spec/005`, RNF002)*
- **Given** uma solicitação de malote, **When** o worker processa, **Then** ela roda em **fila durável com retry**, estado pendente→gerado sobrevive a restart (sem perda silenciosa).
- **Given** uma peça **única indivisível** acima do limite, **When** fragmento, **Then** ela vira **fragmento isolado sinalizado** para tratamento manual (sem split binário); o limite é o parâmetro **global** `SEI_MALOTE_LIMITE_MB`.

### Story 8.1 / 8.2 — Auditoria *(resgate `spec/004`, RNF007)*
- **Given** um perfil de controle, **When** consulta/exporta a trilha, **Then** **não há mascaramento** de PII (salvaguarda = RBAC); acesso inclui o papel **`auditor` somente-leitura**.
- **Given** um export acima de `AUDITORIA_EXPORT_TETO` (ex.: 50k), **When** exporto, **Then** o sistema **sinaliza o volume e conclui** por streaming/paginação (sugere refinar, mas não corta).

### Story 7.3 — Retenção e direitos do titular *(resgate `spec/006`, RNF007)*
- **Given** dados de categorias distintas, **When** avalio o descarte, **Then** aplico o prazo **por categoria** (cadastral/fiscal/contratual), não um prazo único.
- **Given** uma solicitação de direito do titular, **When** ela é atendida, **Then** quem atende é o papel **`dpo`** (Administrador como fallback); a **CPL não** atende.

### Story 9.2 — Transparência *(resgate `spec/007`, RN013)*
- **Given** o portal público, **When** um cidadão acessa, **Then** vê **apenas agregados não-identificáveis** (editais vigentes, secretarias, segmentos CNAE) — **sem** fornecedores, valores ou PII.
- **Given** as projeções públicas, **When** requisitadas, **Then** são calculadas **sob demanda** (materialização/cache é otimização futura sem mudar o contrato).

---

## Cobertura dos Mockups — Gaps do Painel Admin e do wizard (validação 2026-07-02)

Histórias novas identificadas ao validar os bundles contra a doc (ver [VALIDACAO-MOCKUPS.md](VALIDACAO-MOCKUPS.md)). Complementam os épicos existentes; AC em Given/When/Then.

### Story 3.4 — Ciclo de vida do Edital *(gap G6 · RN014, AD-37)*
As a Secretaria/Gestor, I want gerir o estado do edital ao longo do processo, So that a vitrine e a distribuição respeitem a fase correta.
- **Given** um edital em `Rascunho`, **When** eu o publico, **Then** ele passa a `Aberto` e **só então** aparece na vitrine do fornecedor (RF003); a transição é auditada.
- **Given** um edital, **When** avança por `Em Análise → Em Distribuição → Homologado → Em Execução`, **Then** cada transição é registrada na trilha e a distribuição (RF005) só é possível a partir de `Em Distribuição`; `Homologado` congela a alocação (AD-10).

### Story 5.5 — Termo de Aceite e cancelamento de credenciamento *(gaps G8/G9 · RN016)*
As a fornecedor, I want concluir meu credenciamento por Termo de Aceite e poder cancelá-lo antes da distribuição, So that eu formalize a adesão com rastro e mantenha controle.
- **Given** um credenciamento na etapa final, **When** aceito o **Termo de Aceite**, **Then** o aceite (finalidade + timestamp + versão do termo) é registrado na trilha e o credenciamento conclui. *(A etapa "Prova de vida"/biometria do mockup é **Release 2 condicional a RIPD** — não MVP; ver VALIDACAO-MOCKUPS.md §G5.)*
- **Given** um credenciamento **antes da distribuição**, **When** o fornecedor cancela, **Then** o registro passa a cancelado (evento na trilha) e libera a participação; **após** homologação, a saída se dá por substituição (Story 5.4).

### Story 9.4 — Gestão de Secretarias *(gap G1 · RF020, AD-16/AD-38)*
As a Administrador, I want cadastrar e manter Secretarias, So that editais possam referenciar uma secretaria demandante válida.
- **Given** o Painel Admin, **When** crio uma secretaria (Nome, Sigla, Responsável), **Then** ela fica disponível para seleção na criação de editais (1 Edital → 1 Secretaria, AD-16).
- **Given** uma secretaria referenciada por editais, **When** a removo, **Then** ela é **inativada** (RN015/AD-38), não apagada; editais existentes permanecem íntegros.

### Story 9.5 — Catálogo de CNAE / Setores industriais *(gap G2 · RF021)*
As a Administrador, I want manter o catálogo de CNAE/setores, So that o "CNAE exigido" do edital e o match do fornecedor usem uma base curada.
- **Given** o Painel Admin, **When** cadastro um setor (Código CNAE de 7 dígitos + Descrição da atividade), **Then** ele fica selecionável como "CNAE exigido" no edital e participa do match (RF003, RN001).
- **Given** um CNAE em uso, **When** o desativo, **Then** é inativado (RN015), preservando os vínculos existentes.

### Story 9.6 — Catálogo de Tipos de Documento *(gap G3 · RF022)*
As a Administrador, I want definir os tipos de documento aceitos, So that o upload e a covalidação sigam regras consistentes.
- **Given** o Painel Admin, **When** crio um tipo (Nome, Formato aceito, regra de Validade ou "Sem validade", Categoria, exigência de Exercício), **Then** ele parametriza o upload (RF002) e a covalidação (RF004).
- **Given** um tipo com regra "Sem validade" (ex.: Contrato Social), **When** um documento desse tipo é enviado, **Then** ele **não** é tratado como expirável.

### Story 9.7 — Gestão de Usuários internos e cargos *(gap G4 · RF023, §15)*
As a Administrador, I want cadastrar servidores e atribuir cargo/perfil, So that o acesso respeite o RBAC.
- **Given** o Painel Admin, **When** crio um usuário (Nome, E-mail, **Cargo**), **Then** o cargo mapeia num papel RBAC (§15/AD-35) e as permissões efetivas seguem o papel.
- **Given** um usuário, **When** aciono reset de senha, **Then** o fluxo de nova/confirmar senha respeita o provedor de identidade (AD-20) e registra o evento.
- **Given** um usuário desligado, **When** o removo, **Then** é **inativado** (RN015/AD-38), preservando a autoria histórica de suas ações na trilha.

---

## Cobertura da Validação 01 — Feedback do cliente (2026-07-05)

Histórias novas identificadas na primeira validação com o cliente (ver [VALIDACAO-CLIENTE-01.md](VALIDACAO-CLIENTE-01.md)). Complementam os épicos existentes (não reescrevem nem renumeram as histórias já publicadas); AC em Given/When/Then. Novos requisitos: RF024 (Termo de Responsabilidade), RF025 (PDF oficial do Edital, complementa RF008), RF026 (Desistência covalidada). Novas RN017–RN021 e AD-39/40/41. A biometria (RF012) segue **fora do MVP** (Release 2) — adiamento ratificado pelo cliente. O PDF oficial do Edital **complementa** o formulário estruturado, não o substitui.

### Story 1.8 — Migração de nomenclatura Requerente→Cadastrado *(AD-41)*
As a equipe de desenvolvimento, I want renomear o rótulo da fase inicial de "Requerente" para "Cadastrado", So that a nomenclatura da máquina de estado reflita a linguagem validada com o cliente sem quebrar a trilha.
- **Given** a máquina de fase do fornecedor (AD-14) com a fase inicial rotulada `Requerente`, **When** aplico a migração, **Then** o rótulo passa a `Cadastrado` no schema/enum, nos `data-cy` e na UI, cobrindo AD-41.
- **Given** a trilha de auditoria existente, **When** a migração é aplicada, **Then** ela é **forward-only** (AD-28), sem mutar eventos históricos, e a renomeação de código é tratada como história dedicada.

### Story 2.4 — Termo de Responsabilidade na declaração de capacidade *(RF024, RN019)*
As a fornecedor, I want aceitar um Termo de Responsabilidade ao informar minha capacidade produtiva, So that a declaração de capacidade seja formalizada com rastro (RN005).
- **Given** a etapa de credenciamento em que informo a **capacidade produtiva**, **When** preencho a capacidade, **Then** o sistema exige o **aceite do Termo de Responsabilidade** (RF024) e o botão "Prosseguir" fica **bloqueado** enquanto o aceite não for marcado (RN019).
- **Given** o aceite do termo, **When** prossigo, **Then** o aceite (**versão do termo + timestamp**) é registrado na trilha.

### Story 3.5 — Anexação e download do PDF oficial do Edital *(RF025, AD-39)*
As a Secretaria/Gestor, I want anexar o PDF oficial do Edital (SEI) e disponibilizá-lo para download, So that o fornecedor acesse o documento formal que complementa o formulário estruturado (Story 3.1).
- **Given** um edital em `Rascunho`, **When** tento publicá-lo (`Rascunho → Aberto`, RN014), **Then** a anexação do **PDF oficial do SEI é obrigatória** (RF025, AD-39) e a publicação é impedida sem o arquivo.
- **Given** um edital `Aberto` com PDF anexado, **When** o fornecedor acessa o edital, **Then** vê a ação **"Baixar Edital em PDF"** e obtém o arquivo oficial, que **complementa** (não substitui) o formulário estruturado da Story 3.1.

### Story 5.6 — Visão individual da cota e vedação de edição manual *(RN020, RN017)*
As a fornecedor, I want ver apenas a demanda total e a minha própria cota, So that o rateio dos demais participantes permaneça confidencial (RN020). *(Épico 5 segue **BLOQUEADO** até fechar Item × Lote — manter o aviso do épico.)*
- **Given** uma distribuição calculada, **When** o fornecedor consulta sua alocação, **Then** vê **somente a demanda total do edital + a sua cota**, sem o rateio dos demais participantes (RN020).
- **Given** cotas já calculadas pelo motor, **When** um administrador tenta ajustá-las, **Then** o sistema **veda a edição manual** das cotas (RN017): alterações só ocorrem por transição append-only `SubstituicaoCota` (AD-10), reforçando a imutabilidade.

### Story 5.7 — Desistência covalidada e acionamento da Reserva *(RF026, RN018, AD-40)*
As a fornecedor titular, I want solicitar a desistência da minha cota após a distribuição, So that a saída seja formalizada por covalidação e a Reserva assuma a cota liberada.
- **Given** um titular com cota **após a distribuição**, **When** ele solicita a desistência (RF026), **Then** o registro passa a `Pendente de Desistência` (transição covalidada append-only na máquina AD-14, AD-40).
- **Given** um registro `Pendente de Desistência`, **When** o administrador **confirma**, **Then** o titular passa a `Desistente` e é **acionada a substituição pela Reserva** (RN004, Story 5.3/5.4, AD-10/AD-25); **When** o administrador **rejeita**, **Then** a solicitação **reverte** ao estado anterior (RN018).
- **Given** um credenciamento **antes da distribuição**, **When** o fornecedor quer sair, **Then** o cancelamento é **self-service** (Story 5.5, RN016), sem covalidação.

### Story 9.8 — Card "Desistências Pendentes" no Painel Admin *(RN018, RF013)*
As a gestor SMGA/CPL, I want um indicador de desistências aguardando covalidação no dashboard, So that eu acompanhe e trate as solicitações pendentes.
- **Given** desistências em `Pendente de Desistência`, **When** abro o Painel Admin (RF013), **Then** vejo um card **"Desistências Pendentes"** clicável com a contagem das solicitações aguardando covalidação (RN018).
- **Given** o card de indicadores, **When** o sistema apresenta os estados, **Then** distingue **"Em Análise"** (aguardando covalidação, reversível) de **"Bloqueado"** (impedimento efetivo), conforme RN021.

### Story 9.9 — Landing pública "Compra Mais Rio Branco" *(RF010, UX)*
As a cidadão/fornecedor, I want uma landing pública institucional como porta de entrada, So that eu conheça o programa e acesse o sistema a partir do site da Prefeitura (não por um link seco de login).
- **Given** o portal público (RF010), **When** acesso a landing, **Then** vejo o título **"Compra Mais Rio Branco"**, as **logomarcas oficiais**, o e-mail da comissão **comissoes.smga22@gmail.com** e a **paleta azul institucional**.
- **Given** a jornada de entrada (site da Prefeitura → Landing), **When** decido entrar, **Then** uso os CTAs **"Acessar Sistema" / "Cadastrar"** da landing, e não um link direto de login.
