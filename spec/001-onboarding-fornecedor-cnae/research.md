# Phase 0 — Research: Onboarding B2G e Filtro por CNAE

Nenhum `NEEDS CLARIFICATION` permaneceu: a stack foi decidida na Espinha de Arquitetura (31 ADs) e
as ambiguidades de feature foram resolvidas via `/speckit-clarify`. Este documento consolida as
decisões que governam o plano.

## D1 — Stack e topologia
- **Decisão:** TypeScript; backend monólito modular Node.js 24 LTS + Express/Fastify (**sem NestJS**); SPAs React 19 + Vite;
  PostgreSQL 18; object storage S3-compatível atrás de adaptador.
- **Rationale:** versões verificadas como atuais (2026-06-29); **sem NestJS** por decisão do
  solicitante — DI, módulos e validação passam a ser convenção explícita do time (libs leves a
  critério); um único deployable reduz overhead operacional no MVP (AD-1).
- **Alternativas:** microsserviços (overhead precoce — rejeitado); Spring Boot (o time/origem
  CompraAC favorece Node) — ambos registrados na espinha.

## D2 — Match de CNAE (clarify 2026-06-29)
- **Decisão:** match **exato por subclasse CNAE (7 dígitos)** entre os CNAEs válidos do fornecedor
  (principal/secundários) e as subclasses exigidas pelo edital.
- **Rationale:** código oficial da Receita, inequívoco e auditável pelo TCE; evita ambiguidade no
  filtro (FR-009) e nos testes de visibilidade (SC-003).
- **Alternativas:** match por classe (5 dígitos, mais permissivo) e match hierárquico configurável
  por edital — rejeitados por reduzir auditabilidade/previsibilidade.

## D3 — Vínculo do Procurador (clarify 2026-06-29)
- **Decisão:** o **titular** (responsável legal) cadastra-se primeiro e convida/adiciona/remove
  procuradores; toda ação de procurador registra ator + empresa na trilha.
- **Rationale:** controle pelo titular + rastro auditável endereçam o vetor de fraude por
  procurador/contador (origem da antiga proposta de biometria) sem a biometria no MVP.
- **Alternativas:** autodeclaração + covalidação da CPL (mais pesado para o MVP — diferido).

## D4 — Fallback da Receita
- **Decisão:** consulta via adaptador ACL com circuit breaker; na indisponibilidade, entrada
  manual **visível** marcada para covalidação posterior (resultado tipado com proveniência).
- **Rationale:** degradação graciosa (AD-4/AD-5); o fallback nunca é beco sem saída (UX-DR2).
- **Alternativas:** bloquear o cadastro quando a Receita cai — rejeitado (barreira de acesso).

## D5 — Dados oficiais read-only + re-sync (RN009/RF018)
- **Decisão:** Razão Social, CNAE e Porte são somente leitura; só Nome Fantasia, Endereço e
  Telefone são editáveis; campos oficiais mudam apenas por re-sincronização ("Sincronizar agora",
  grava timestamp/fonte/status).
- **Rationale:** integridade do dado oficial + transparência da origem (AD-31).

## D6 — Consentimento LGPD + cifra
- **Decisão:** consentimento (finalidade + timestamp) antes de tratar PII; cifra de PII em repouso
  e trânsito; acesso segregado por RBAC; identidade plugável (credenciais locais no MVP).
- **Rationale:** Princípio V da constituição + RNF007.

## D7 — Auditoria
- **Decisão:** cadastro, atualização e upload emitem eventos consumidos pela trilha append-only
  (escritor único), consultável e exportável.
- **Rationale:** Princípio II + RNF003.
