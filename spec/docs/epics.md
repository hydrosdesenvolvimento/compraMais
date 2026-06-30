---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-comparMaisSpec-2026-06-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-compra-mais-2026-06-29/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-compra-mais-2026-06-29/EXPERIENCE.md
  - _bmad-output/planning-artifacts/plano-releases.md
  - _bmad-output/planning-artifacts/matriz-lacunas.md
  - source/05-HistoriasUsuario.md
  - source/06-CasosUso.md
---

# Compra Mais - Epic Breakdown

## Overview

Decomposição de épicos e histórias do Compra Mais a partir do PRD (v2.2), da Espinha de Arquitetura (31 ADs), do **contrato de UX** (DESIGN/EXPERIENCE, ratificado) e do plano de releases (3 ondas). Run regenerada do zero com o contrato de UX presente — UX-DRs são requisitos de primeira classe.

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
NFR006 (RNF006): Identidade visual e acessibilidade conforme o contrato de UX (paleta azul-700 #0061AE, Poppins, e-MAG/WCAG 2.1 AA).
NFR007 (RNF007): LGPD — base legal, cifra repouso/trânsito, retenção/descarte, RIPD, DPO, acordos Art.26.
NFR008 (RNF008): Determinismo/reprodutibilidade do motor.
```

### Additional Requirements

Da Espinha de Arquitetura (31 ADs):

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

Do contrato de UX (DESIGN.md + EXPERIENCE.md), ratificado a partir de `source/AI-UI-Design/`:

```
UX-DR1: Design system compartilhado entre os 2 SPAs — Poppins, azul-700 #0061AE + escala, âmbar #FFB300 (ação), raio 8px/999px, espaçamento 8/12/14/16/20.
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

> ✅ Contrato de UX: [DESIGN.md](ux-designs/ux-compra-mais-2026-06-29/DESIGN.md) / [EXPERIENCE.md](ux-designs/ux-compra-mais-2026-06-29/EXPERIENCE.md).

**Acceptance Criteria:**
**Given** os tokens (Poppins; azul-700 #0061AE + escala; âmbar #FFB300; raio 8px/999px; espaçamento 8/12/14/16/20),
**When** os dois SPAs consomem o design system,
**Then** componentes (AuthPanel, sidebar, cards, labels/tags, botões, barra de acessibilidade) e paleta são consistentes,
**And** a acessibilidade atende e-MAG/WCAG 2.1 AA (foco visível âmbar 3px, alto contraste, teclado),
**And** a IA segue o EXPERIENCE.md (Início, Editais, Meus credenciamentos, Documentos, Demandas distribuídas).
