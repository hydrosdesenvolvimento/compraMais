---
date: 2026-07-18
sequence: 001
domain: frontend + backend (credenciamento / documentos)
action_type: adaptar / refresh
status: logged
---

# Log de Prompt — tela-documentos-portal-fornecedor

## Prompt Original

> @tech-lead em uma nova branch vamos implementar a tela de "Documentos", com base na
> nossa documentação e no @spec/Prototipo/portal-fornecedor.html
> (acompanhado de captura de tela da "Gestão de Documentos" do protótipo)

---

## Interpretação

### Intenção Principal

Elevar a tela `/documentos` (Portal do Fornecedor) à fidelidade do protótipo
`spec/Prototipo/portal-fornecedor.html` (bloco `isDocs` — "Gestão de Documentos"), em nova
branch Gitflow. A tela já existia (`frontend/src/pages/publico/Documentos.tsx`), porém em versão
simplificada (2 colunas, status binário vigente/expirado). O protótipo/captura exige:
coluna **VALIDADE**, **4 estados** de status (Aprovado · Vence em N dias · Reprovado · Pendente),
tarja expansível **"Reprovado pela CPL"** com motivo + botão **"Reenviar Documento Corrigido"**,
e ações **Visualizar/Baixar** por linha.

### Entidades Identificadas

| Entidade | Tipo | Relevância |
|---|---|---|
| `spec/Prototipo/portal-fornecedor.html` (`sc-if isDocs`) | Spec de UI (fonte da verdade visual) | Define tabela, 4 estados, tarja de reprovação e ações |
| `frontend/src/pages/publico/Documentos.tsx` | Componente React | Tela alvo (reescrita) |
| `backend/src/credenciamento/application/gerir-documentos.ts` | Caso de uso | Read model `listar` — precisava expor `motivoReprovacao` |
| `backend/src/credenciamento/domain/documento.ts` | Agregado | Já armazenava `status`/`dataValidade`/`motivoReprovacao` (nada a mudar) |
| `frontend/src/lib/api.ts` (`DocItem`) | Contrato | +`motivoReprovacao` |
| `frontend/src/design-system/components/Pill.tsx` + `index.css` | Design System | +tom `neutral` (estado "Em análise") |
| `frontend/src/i18n/locales/{pt-BR,en,es}.json` | i18n | Toda string visível vem do i18n (PRJ-DEC-12) |

### Decisões de escopo

- **Mínima superfície de backend**: o domínio `Documento` já persiste `status` (covalidação
  UC006), `dataValidade` e `motivoReprovacao`. O único ajuste foi **expor `motivoReprovacao`** no
  read model `GerirDocumentos.listar` (necessário para a tarja "Reprovado pela CPL"). Os demais
  estados são **derivados no frontend** a partir de `status` + `situacao` + `dataValidade`.
- **Mapa de estados** (derivado, sem endpoint novo): `reprovado`→"Reprovado" (tarja + reenvio);
  `pendente`→"Em análise" (aguardando CPL); `aprovado`+`expirado`→"Vencido"; `aprovado`+vigente e
  validade ≤ 30 dias→"Vence em N dias"; `aprovado`+vigente→"Aprovado".
- **"Pendente de envio" (checklist de docs exigidos não enviados)** do protótipo **não** foi
  materializado: o domínio não modela "documento exigido porém ausente" (só documentos enviados).
  Exigiria um join com o catálogo `tipos-documento`. Registrado como deferimento (ver backlog).
- **Sem alteração de seed**: o fornecedor demo não tem documentos semeados (limitação pré-existente);
  a tela renderiza corretamente assim que houver documentos enviados pelo fluxo de credenciamento.

## Rastreabilidade

- Backend: `gerir-documentos.ts` (read model +`motivoReprovacao`); teste em
  `backend/tests/integration/documentos.spec.ts` (TDD: caso "Reprovado pela CPL").
- Frontend: `Documentos.tsx` (reescrita), `api.ts` (`DocItem`), `Pill.tsx`/`index.css` (`neutral`),
  i18n (22 chaves × 3 idiomas); teste em `Documentos.test.tsx`.
- Gates em container (DEC-STR-34): backend 459 passed / 14 skipped; frontend 102 passed.
