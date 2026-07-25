---
date: 2026-07-25
sequence: 001
domain: backend (relatorios) + frontend (admin/relatorios) + permissoes + i18n
action_type: criar
status: logged
---

# Log de Prompt — modulo-relatorios-smga

## Prompt Original

> @tech-lead~, @qa-expert e @business-analyst implementem um módulo de relatório no perfil SMGA, ele
> deverá gerar os relatórios em pdf, arquivo de download direto, com cabeçalho trazem, pelo menos, logo
> do sistema, titulo do relatório, data de emissão e período dos dados, deverá ainda permitir a
> exportação dos dados brutos em formatos json e csv, deverá permitir o filtro de dados por data e pro
> secretaria. Elaborem ao menos 6 relatórios com dados relevantes dos processos

## Interpretação

### Intenção Principal

Adicionar ao **Painel Admin (perfil SMGA)** um módulo de **Relatórios gerenciais dos processos**:

- **PDF** com download direto; cabeçalho com **logo + título + data de emissão + período dos dados**.
- **Exportação de dados brutos** em **JSON** e **CSV**.
- **Filtros** por **data** (período) e por **secretaria**.
- **≥ 6 relatórios** com dados relevantes dos processos.

### Abordagem (arbitragem do Tech Lead)

- **Backend responde dado estruturado, i18n/PDF/CSV no frontend** (PRJ-DEC-12): novo módulo hexagonal
  `relatorios` (read-only) com uma rota `GET /admin/relatorios/:tipo?de=&ate=&secretaria=` (RBAC
  `cpl/administrador/smga`) devolvendo `{ tipo, geradoEm, periodo, colunas, linhas, totais }` com CHAVES
  estáveis. A `RelatoriosFonte` (porta) é satisfeita no `server.ts` compondo os repositórios já
  existentes (padrão do `paineisFonte`) — sem migrações novas.
- **PDF no cliente** com `jspdf` + `jspdf-autotable` (download direto via `save()`); logo do sistema
  embutido no cabeçalho. **CSV/JSON** reusam `lib/exportar.ts`. Assim a localização (3 idiomas) fica no
  frontend, como manda o projeto.
- **Nova tela `relatorios`** no catálogo de telas (backend `permissoes/domain/tela-admin.ts` + frontend
  `telas-admin.tsx`), visível por padrão a **smga** e **administrador**.

### Os 6 relatórios

1. **Editais por secretaria e situação** — nº, objeto, secretaria, situação, itens, valor estimado, vigência, criação.
2. **Distribuições e investimento por secretaria** — demanda, distribuído, déficit, fornecedores, valor distribuído.
3. **Rateio de cotas por fornecedor** — fornecedor, CNPJ, edital, secretaria, cota, valor.
4. **Fornecedores credenciados por porte** — razão social, CNPJ, porte, situação, status, CNAE.
5. **Participação por porte (MEI/ME)** — porte, nº fornecedores, %, com % MEI.
6. **Bloqueios ativos de fornecedores** — fornecedor, tipo, situação, término, motivo.

Filtro por data em todos (registerDate/geradoEm); secretaria nos relatórios 1–3 (a UI desabilita o
seletor nos demais, coerente com `suportaSecretaria` do backend).

### Restrições e risco

- Distribuições **agregadas legadas** (sem detalhamento por item) rendem `valorDistribuido`/`cotas` = 0,
  exatamente como o `investimentoDistribuido` do paineis — comportamento consistente, não defeito.
- `jspdf` aumenta o bundle do admin (aviso de chunk-size no build); aceitável para tela administrativa.

## Rastreabilidade

- Backend: `backend/src/relatorios/**`, wiring em `backend/src/server.ts`, tela em `permissoes/domain/tela-admin.ts`.
- Frontend: `frontend/src/pages/admin/Relatorios.tsx`, `frontend/src/lib/relatorios.ts`, `lib/api.ts`, `router.tsx`, `lib/telas-admin.tsx`, `i18n/locales/{pt-BR,en,es}.json`.
- Testes: `backend/tests/unit/relatorios.spec.ts`, `backend/tests/integration/relatorios.spec.ts`, `frontend/src/lib/relatorios.test.ts`.
- Registro técnico: `docs/dev/2026-07-25-registro-relatorios-smga.md`.
