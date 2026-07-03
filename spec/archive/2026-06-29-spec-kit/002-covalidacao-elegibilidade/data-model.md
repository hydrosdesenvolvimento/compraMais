# Phase 1 — Data Model: Covalidação Antifraude e Elegibilidade Fiscal

> Entidades do módulo `credenciamento`. IDs UUID; datas ISO-8601 UTC. **Classes TypeScript ricas**
> (AD-32, Constituição v3.1.0), camada de Domínio; persistência por repositórios na de Adaptadores.
> Toda entidade estende **`EntidadeBase`** (AD-33 / v3.2.0): `id:UUID, registerDate, updateDate,
> lastUserUpdate:User.userName`.

## AnaliseCovalidacao
- `id`, `documentoId` (FK → Documento/001), `analistaId` (conta CPL), `resultado` (aprovado | reprovado),
  `justificativa` (string — **obrigatória se reprovado**), `decididoEm`.
- Regras: só perfis CPL/SMGA criam (FR-013); reprovação sem justificativa rejeitada (FR-002, RN003);
  documentos declaratórios exigem análise humana (FR-003). Histórico N:1 com Documento.
- Efeito: transiciona o `Documento` (001) `Pendente → Aprovado | Reprovado`.

## VerificacaoInadimplencia
- `id`, `fornecedorId` (FK), `porta` (credenciamento | distribuicao | contrato), `estado`
  (sem_debito | debito_ativo | penalidade | inidoneidade), `fonte`, `executadaEm`,
  `frescor` (verificado | stale | indisponivel).
- Regra: reavaliada em cada porta (FR-006); nunca cacheada como permanente.

## Bloqueio
- `id`, `fornecedorId` (FK), `tipo` (debito | penalidade | inidoneidade),
  `dataTermino` (nullable; **origem**: fonte | manual — clarify D3), `situacao` (ativo | liberado), `motivo`.
- Regras: débito → ativo enquanto houver débito; penalidade/inidoneidade → até `dataTermino`;
  liberação por reconsulta (transitório, FR-006/011). Métodos ricos: `estaAtivo(hoje)`, `liberar()`.

## FilaCovalidacao (visão)
- Projeção de documentos `Pendente` por fornecedor com `tempoDecorrido` (FR-014; sem SLA).
- **Probe QBE (FR-015 / v3.3.0):** a listagem aceita uma instância parcial de `Documento` como filtro —
  no mínimo `status` e `tipo`; campos ausentes ignorados (AND). `DocumentoRepository` ganha
  `buscarPorExemplo(probe: Partial<Documento>, page)`; o caso de uso traduz o probe em critério, sem o
  Domínio conhecer o transporte. Paginação/ordenação são parâmetros separados, fora do probe.

## Referências (feature 001)
- **Documento**: alvo da covalidação (status mudado aqui).
- **Fornecedor / Edital / ContaAcesso**: contexto; RBAC define quem covalida.
- **Trilha de Auditoria**: recebe eventos `DocumentoAprovado`, `DocumentoReprovado`,
  `InadimplenciaVerificada`, `BloqueioAplicado`, `BloqueioLiberado` (escritor único — AD-18).
