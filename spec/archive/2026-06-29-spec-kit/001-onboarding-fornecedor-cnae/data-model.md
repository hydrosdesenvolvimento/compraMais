# Phase 1 — Data Model: Onboarding B2G e Filtro por CNAE

> Entidades do escopo do onboarding (módulos `catalogo` e parte de `credenciamento`). IDs = UUID;
> datas = ISO-8601 UTC. Campos oficiais da Receita são read-only (RN009).
>
> **Representação (Constituição v3.1.0 / AD-32):** cada entidade é uma **classe TypeScript rica**
> (comportamento e invariantes encapsulados — ex.: `Fornecedor.podeAvancar()`, `Documento.estaVigente()`),
> na camada de **Domínio** da Clean Architecture; persistência via repositórios na camada de Adaptadores.
> Não usar interfaces/tipos anêmicos nem objetos planos como modelo de domínio.
>
> **EntidadeBase (Constituição v3.2.0 / AD-33):** toda entidade abaixo estende `EntidadeBase` com
> `id: UUID`, `registerDate`, `updateDate`, `lastUserUpdate: User.userName`. Os Value Objects (Cnpj) não.

## Fornecedor
- `id` (UUID), `cnpj` (único), `razaoSocial` (read-only/Receita), `nomeFantasia` (editável),
  `porte` (read-only/Receita), `situacaoCadastral` (ativa | baixada | inapta | suspensa),
  `endereco` (estruturado: logradouro, número, bairro, município, UF, CEP — editável; base para
  análise territorial, FR-012), `telefone` (editável), `origemDados` (oficial | manual),
  `criadoEm`, `atualizadoEm`.
- Relações: 1:N `CnaeFornecedor`, 1:N `Documento`, 1:N `ContaAcesso`, 1:1 `Consentimento`,
  1:N `SincronizacaoReceita`.
- Regras: cadastro bloqueado se `situacaoCadastral` ≠ ativa (FR-005); CNPJ não duplicado (FR-004).

## CnaeFornecedor
- `id`, `fornecedorId` (FK), `codigoSubclasse` (7 dígitos), `tipo` (principal | secundario),
  `ativo` (bool), `origem` (oficial | manual).
- Regra: compatibilidade com edital = match exato de `codigoSubclasse` (D2).

## Documento
- `id`, `fornecedorId` (FK), `tipo` (contratoSocial | certidao | balanco | atestado | ...),
  `arquivoRef` (ponteiro no object storage, cifrado), `formato` (pdf | jpg | png),
  `dataValidade` (opcional — nulo = sem expiração), `status` (pendente | aprovado | reprovado — covalidação),
  `criadoEm`.
- Vigência: **derivada** de `dataValidade` via `estaVigente(hoje)` — não é campo persistido (evita estado
  redundante e divergência). Documento reutilizável entre editais enquanto vigente (FR-007/008).

## ContaAcesso
- `id`, `fornecedorId` (FK), `papel` (titular | procurador), `identificador`, `credencialRef`
  (provedor de identidade plugável), `convidadoPor` (FK ContaAcesso, nulo p/ titular),
  `ativo` (bool).
- Regras: o **titular** é criado no cadastro e convida/remove procuradores (D3); ações de
  procurador registram ator + empresa na trilha (FR-014).

## Consentimento
- `id`, `fornecedorId` (FK), `finalidade`, `versaoTermo`, `concedidoEm` (timestamp), `titularRef`.
- Regra: obrigatório antes de tratar PII (FR-015).

## SincronizacaoReceita
- `id`, `fornecedorId` (FK), `executadaEm` (timestamp), `fonte` (Receita), `status` (sucesso |
  erro | indisponivel), `camposAtualizados` (lista).
- Regra: re-sync atualiza os campos oficiais; erro preserva os dados anteriores (FR-010 / edge case).

## Edital (referência externa)
- Consumido apenas como alvo do filtro de visibilidade nesta feature. Atributo relevante:
  `subclassesExigidas` (lista de 7 dígitos). Propriedade do módulo `editais` (feature posterior).

## Trilha de Auditoria (referência — módulo `auditoria`)
- Append-only; recebe eventos de cadastro, atualização, upload, re-sync, convite de procurador e
  consentimento (FR-011). Não é escrita diretamente por este módulo (AD-18).
