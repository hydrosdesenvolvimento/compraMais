# Registro técnico — Listagem de Catálogos acima da dobra (UC020)

**Data:** 2026-07-26 · **Tipo:** correção de usabilidade · **Domínio:** Painel Admin · Catálogos
**Branch:** `fix/catalogos-listagem-acima-da-dobra` · **Prompt:** [`docs/prompts/2026-07-26_008_catalogos-listagem-acima-da-dobra.md`](../prompts/2026-07-26_008_catalogos-listagem-acima-da-dobra.md)

## 1. Defeito relatado

> A guia ou seção de CNAEs ativos não fica visível de forma imediata na tela, sendo necessário rolar a
> página para localizá-la.

## 2. Causa

Ordem de renderização de `/admin/catalogos`:

```
título + subtítulo
abas [Atividades (CNAE)] [Tipos de documento] [Materiais e serviços] [Unidades de medida]
┌─ Card: FORMULÁRIO DE CRIAÇÃO ────────┐   ← empurrava tudo para baixo
└──────────────────────────────────────┘
busca | mostrar inativos | exportar
┌─ TABELA ─────────────────────────────┐   ← abaixo da dobra
```

O formulário ficava **entre a aba e a listagem**. Quanto maior o formulário, pior: a aba de materiais e
serviços tem nome, natureza, unidades (chips) e especificações.

**Catálogos era a única tela do painel com formulário inline.** As irmãs — Secretarias, Tipos de
Arquivos e Cadastro de Atividades — já usam "+ Novo" → modal, com a tabela logo abaixo do cabeçalho. A
correção foi alinhar ao padrão existente, não inventar layout novo.

## 3. Depois

```
título + subtítulo                            [+ Novo cadastro]
abas [Atividades (CNAE)] [Tipos] [Materiais] [Unidades]
busca | mostrar inativos | exportar
┌─ TABELA ─────────────────────────────┐   ← primeira tela
```

- O formulário passou a ser montado dentro de `ModalCadastro` (cabeçalho com o nome do catálogo ativo,
  fecha no X, no Escape e no clique fora, corpo rolável).
- O modal **fecha ao criar com sucesso** e **ao trocar de aba** — cada catálogo tem campos próprios, e
  remontar o formulário no lugar seria mais confuso que reabrir.
- A definição declarativa dos catálogos (`CATALOGOS`) **não mudou**: o formulário continua sendo gerado a
  partir dela; só a moldura mudou de lugar.

## 4. Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/ManterCatalogos.tsx` | formulário extraído para `formulario` + `ModalCadastro`; cabeçalho com "+ Novo cadastro"; estado `modalAberto` |
| `src/i18n/locales/{pt-BR,en,es}.json` | `admin.catalogos.novoCadastro`, `.modalTitulo`, `.modalSubtitulo` |
| `src/pages/admin/ManterCatalogos.test.tsx` | abre o modal onde há preenchimento; **2 casos novos** |
| `cypress/e2e/catalogos-layout.cy.ts` | `abrirCadastro()` antes das medições; **1 caso novo** |

Todos os `data-cy` do contrato foram preservados (`form-catalogo`, `campo-*`, `criar`,
`tabela-catalogo`); os novos são `novo-cadastro`, `modal-catalogo`, `fechar-modal`.

## 5. Evidências (container — DEC-STR-34)

```
docker compose --profile test run --rm frontend-test → lint + typecheck + 253 passed (46 arquivos)
```

**3 casos novos**, sendo os dois primeiros a regressão que interessa travar:

| Suíte | Caso |
|---|---|
| `catalogos-layout.cy.ts` | **a listagem está visível na primeira tela, sem rolagem** — mede o topo da tabela contra `window.innerHeight` e exige que o formulário nem exista antes do clique |
| `ManterCatalogos.test.tsx` | a listagem aparece sem o formulário na frente; o cadastro só abre sob demanda |
| `ManterCatalogos.test.tsx` | trocar de aba com o modal aberto fecha o cadastro |

**Pendente do QA:** o caso E2E acima **não foi executado** — o Cypress não roda no profile `test`;
precisa do stack no ar (`docker compose --profile dev`).

## 6. Risco

Baixo e circunscrito a uma tela. O caminho de cadastro ganhou **um clique** ("+ Novo cadastro") — custo
aceito na decisão do solicitante em troca de a listagem, que é a leitura mais frequente, aparecer de
imediato.

## 7. Rollback

Reverter o commit. Sem migração, sem contrato de API alterado, sem dado transformado.

## 8. Rastreabilidade

- **UC020** (manter catálogos) · **RF021/RF022** · Design System (padrão "+ Novo" → modal das telas irmãs).
- Decisão registrada em `.github/agents/memoria/MEMORIA-PROJETO.md` (**PRJ-DEC-21**).
