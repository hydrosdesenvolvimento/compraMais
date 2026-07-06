# Phase 1 — Quickstart (Guia de Validação): Onboarding B2G e Filtro por CNAE

Guia para provar a feature ponta a ponta. Detalhes de entidades e contrato em
[data-model.md](data-model.md) e [contracts/onboarding-api.md](contracts/onboarding-api.md).

## Pré-requisitos
- Backend Node.js (Express/Fastify, sem NestJS) + PostgreSQL 18 (via Testcontainers em CI) e object storage S3-compatível locais.
- Adaptador da Receita em modo **mock/Pact** (sem chave real — desbloqueia o dev).
- SPA do Fornecedor (React + Vite) apontando para a API local.

## Cenários de validação (mapeados a Success Criteria)

1. **Autocadastro com Receita disponível (SC-001, SC-002, US1)**
   - Consultar um CNPJ ativo (mock) → dados preenchidos; confirmar + criar conta titular.
   - Esperado: fornecedor ativo, login funciona, cadastro em < 5 min, sem digitação dos campos oficiais.

2. **Fallback manual (SC-005, US1 cenário 3)**
   - Forçar a Receita indisponível (mock 503) → link "Preencher manualmente" visível; concluir com `origemDados=manual`.
   - Esperado: cadastro criado, marcado para covalidação.

3. **Duplicidade e CNPJ inapto (FR-004/005)**
   - Cadastrar CNPJ já existente → 409; cadastrar CNPJ com situação não-ativa → 422.

4. **Vitrine filtrada por CNAE (SC-003, US2)**
   - Fornecedor com subclasse X; editais exigindo X e Y. Listar editais → só o de X aparece;
     acessar o de Y por link direto → 403.
   - Esperado: 100% compatíveis; incompatível inacessível.

5. **Repositório documental (SC-004, US3)**
   - Upload de documento com validade → reutilizar em 2 editais sem reenviar; documento vencido → marcado expirado, não reutilizável; formato inválido → 422.

6. **Re-sync e read-only (RF018/RN009)**
   - "Sincronizar agora" → grava timestamp/fonte/status; tentar editar Razão Social/CNAE/Porte → 422; editar Nome Fantasia/Endereço/Telefone → 200.

7. **Procurador (FR-014, D3)**
   - Titular convida procurador → procurador age em nome da empresa; ação registra ator+empresa na trilha; procurador tenta exercer direito de titular → bloqueado.

8. **Auditoria (SC-006)**
   - Cadastro, atualização, upload, re-sync, convite e consentimento → todos geram registro consultável na trilha.

## Como rodar (TDD)
- Testes unitários por módulo (`catalogo`, `credenciamento`).
- Integração com Testcontainers (Postgres/storage reais).
- Contrato Pact do adaptador Receita.
- E2E Cypress dos cenários 1, 2 e 4 (fluxos críticos).
- Gate de cobertura combinada ~90% no CI (Constituição, Princípio I).
