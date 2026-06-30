# Phase 1 — Data Model: Editais Individualizados por Secretaria

> Entidades do módulo `editais`. IDs UUID; datas ISO-8601 UTC. **Classes TypeScript ricas** (AD-32),
> camada de Domínio; persistência por repositórios na de Adaptadores. Toda entidade estende
> **`EntidadeBase`** (AD-33 / v3.2.0): `id:UUID, registerDate, updateDate, lastUserUpdate:User.userName`.

## Edital (evoluído)
- `id`, `secretariaId` (**única** — invariante RN007/AD-11), `objeto`, `cnaesAlvo: string[]` (subclasse 7
  dígitos — D2), `quantitativos` (capacidade/quantidade desejada; > 0), `prazoVigencia` (data limite),
  `situacao` (`rascunho` | `publicado` | `encerrado`).
- Regras: 1 edital ↔ 1 secretaria ↔ 1 demanda (FR-002); publicar exige objeto + secretaria + ≥1 CNAE válido +
  quantitativo > 0 + prazo (FR-004); transições válidas só `rascunho→publicado→encerrado` (FR-003).
- Métodos ricos: `criar`, `publicar`, `encerrar`, `editar(campos, userName)` (qualquer campo; emite
  antes/depois — FR-013), `estaPublicado()`, `compatívelCom(cnae)` (consumido pela vitrine 002).
- Reconciliação (research D2): estado legado `aberto`→`publicado`; `distribuido` reservado ao Épico 5 (fora
  do escopo).

## ContestacaoCnae
- `id`, `editalId` (FK), `fornecedorId` (autor — **qualquer cadastrado/ativo**, clarify Q3), `cnaeContestado`,
  `justificativa` (**obrigatória**), `situacao` (`pendente` | `acatada` | `recusada`), `motivoResolucao`
  (obrigatório se recusada), `resolvidaPor` (Secretaria/CPL), `resolvidaEm`.
- Regras: abertura exige fornecedor cadastrado/ativo + justificativa (FR-007); acatar → corrige o CNAE do
  Edital via `editar` (FR-008); recusar exige justificativa (FR-009). N:1 com Edital (histórico).

## CorrecaoCnae / EdicaoEdital (histórico)
- Materializado como **eventos de domínio auditados** (não tabela mutável): `EditalEditado` carrega
  `{ campo, antes, depois, autor, motivo? }`. A trilha append-only (AD-18) é o histórico irrefutável.

## Eventos de domínio (→ auditoria, escritor único AD-18)
- `EditalCriado`, `EditalPublicado`, `EditalEncerrado`, `EditalEditado` (antes/depois),
  `PublicoAlvoAmpliado` (sinalização — FR-014), `ContestacaoCnaeAberta`, `ContestacaoCnaeAcatada`,
  `ContestacaoCnaeRecusada`.

## Busca por instância parcial (QBE — FR-011 / v3.3.0)
- `EditalRepository.buscarPorExemplo(probe: { secretariaId?, situacao?, cnae? }, page?)` — filtro AND, campos
  ausentes ignorados; paginação/ordenação fora do probe. Mesmo padrão de `DocumentoRepository` (002).

## Referências
- **Secretaria / Gestor / CPL (identidade, RBAC)**: dona do edital e autora das ações.
- **Fornecedor / CNAE (001)**: enquadramento e legitimidade de contestação; validação de CNAE via ACL Receita.
- **Vitrine `ListarEditaisCompativeis` (002)**: consome editais `publicado` compatíveis por CNAE — reusada.
