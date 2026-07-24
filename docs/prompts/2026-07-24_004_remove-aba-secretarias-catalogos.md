---
date: 2026-07-24
sequence: 004
domain: frontend (Painel Admin · Catálogos)
action_type: refatorar
status: logged
---

# Log de Prompt — remove-aba-secretarias-catalogos

## Prompt Original

> remova a aba secretarias de http://localhost:5173/#/admin/catalogos

## Interpretação

Retirar a aba **Secretarias** da tela unificada de Catálogos (`/admin/catalogos` = `ManterCatalogos`). As Secretarias continuam sendo mantidas na **tela dedicada** `/admin/secretarias` (`Secretarias.tsx`) — a aba aqui era uma duplicação do mesmo cadastro.

### Como foi feito

- Removida a entrada `secretarias` do array config-driven `CATALOGOS` (a aba, o formulário e a tabela derivam dele).
- O `slug` default deixou de ser `'secretarias'` e passou a ser `CATALOGOS[0].slug` (agora `setores-cnae`).
- Subtítulo da tela atualizado (não cita mais "secretarias") nos 3 idiomas.
- Chaves i18n órfãs removidas (`admin.catalogos.tabs.secretarias`, `campos.sigla`, `campos.nome`, `campos.responsavel`) — nenhuma outra tela as usa (`Secretarias.tsx` usa `admin.secretarias.*`).
- Testes de componente atualizados: o default virou Setores (CNAE); novo caso assere que a aba Secretarias **não existe**.

### Restrições

- i18n 3 idiomas (PRJ-DEC-12); gate no container (DEC-STR-34); Design System.
- Não mexe no backend nem na tela dedicada de Secretarias.

## Plano de Ação

```mermaid
flowchart TD
    A([remova a aba Secretarias de /admin/catalogos]) --> B[Remover entrada 'secretarias' de CATALOGOS]
    B --> C[Default slug = CATALOGOS[0] setores-cnae]
    C --> D[Subtítulo + chaves i18n órfãs]
    D --> E[Testes: default Setores + aba ausente]
    E --> F[Gate + captura]
    F --> G([PR])
```

## Contexto do Projeto Aplicado

> `ManterCatalogos` é config-driven (UC020): abas/form/tabela derivam do array `CATALOGOS`. Secretarias tem tela própria (`/admin/secretarias`), então a aba aqui era redundante. Alteração só de frontend; i18n e Design System preservados.

## Resultado Esperado

Tela de Catálogos sem a aba Secretarias (restam Setores/Tipos de documento/Materiais e serviços), default em Setores; gate verde e captura confirmando.
