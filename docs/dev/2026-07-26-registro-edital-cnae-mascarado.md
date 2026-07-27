# Registro técnico — Editar edital falhava com `CnaeInvalido` (UC003 / RF007)

**Data:** 2026-07-26 · **Tipo:** correção de defeito · **Domínio:** Gestão de Editais
**Branch:** `bugfix/edital-cnae-mascarado-na-edicao` · **Prompt:** [`docs/prompts/2026-07-26_009_edital-cnae-mascarado-na-edicao.md`](../prompts/2026-07-26_009_edital-cnae-mascarado-na-edicao.md)

## 1. Defeito

> Ao editar um edital já cadastrado (…) mesmo sem alterar o CNAE, o sistema apresenta:
> `Invalid CNAE: expected a 7 digit subclass`

## 2. Causa — quatro camadas somadas

| # | Onde | O quê |
|---|---|---|
| 1 | `GerirEditais.tsx` (modal de edição) | pré-preenche o campo com `formatarCnae` → **`1412-6/01`** |
| 2 | `mutationFn` de salvar | `v.cnae.split(',').map(c => c.trim())` → manda **o texto literal, com máscara** |
| 3 | `editais/application/gerir-editais.ts` | valida `^\d{7}$` → **422 `CnaeInvalido`** |
| 4 | i18n | **não existia `erros.CnaeInvalido`** → o frontend caía no fallback e exibia a mensagem crua do backend, em inglês |

Basta abrir o modal e salvar: o valor que a própria tela escreveu no campo é recusado pela API.

O caminho de **criação** tinha o mesmo `mutationFn` não normalizado. Não falhava porque o campo nasce
vazio e o placeholder pede dígitos — mas colar um CNAE mascarado quebrava do mesmo jeito.

## 3. Onde corrigir — e onde não

**Não no backend.** `^\d{7}$` é o contrato da API e o formato de armazenamento (`setores_cnae`,
`editais.cnaes_alvo`, o match do fornecedor em `compativelCom`). Relaxar ali propagaria máscara para
dentro do domínio e quebraria a comparação exata de subclasse.

**No frontend**, pela regra simples: *quem mascara para exibir é quem desfaz para enviar*. Nasce
`subclassesCnae` em `lib/br.ts`, ao lado dos demais formatos brasileiros:

```ts
export function subclassesCnae(valor: string): string[] {
  return (valor ?? '').split(',').map(soDigitos).filter(Boolean);
}
```

Ganho colateral: colar `1412-6/01` no cadastro passa a funcionar.

## 4. Achado adicional (extensão consciente do escopo)

`FilaContestacoes.tsx` — **acatar** uma contestação de CNAE — usava exatamente o mesmo padrão não
normalizado e grava **o mesmo campo** (`cnaesAlvo` do edital). Corrigido junto: é o mesmo defeito, a uma
chamada de distância, no fluxo que escreve o mesmo dado. Deixá-lo significaria a mesma mensagem de erro
reaparecendo por uma tela vizinha.

## 5. Arquivos

| Arquivo | Mudança |
|---|---|
| `src/lib/br.ts` | **novo** `subclassesCnae` |
| `src/pages/admin/GerirEditais.tsx` | criar e editar passam a normalizar |
| `src/pages/admin/FilaContestacoes.tsx` | acatar contestação idem |
| `src/i18n/locales/{pt-BR,en,es}.json` | `erros.CnaeInvalido` |

Backend **não alterado**.

## 6. Evidências (container — DEC-STR-34)

```
docker compose --profile test run --rm frontend-test → lint + typecheck + 261 passed (46 arquivos)
```

**3 casos novos:**

| Caso | O que trava |
|---|---|
| editar sem tocar no CNAE envia dígitos, não a máscara | **o cenário do relato**; assere `cnaesAlvo: ['1412601']` e que o campo exibe `1412-6/01` |
| editar com vários CNAEs mascarados | `'1412-6/01, 4721-1/02'` → `['1412601', '4721102']` |
| `subclassesCnae` (unidade) | máscara, dígitos puros, espaços, vazios entre vírgulas, entrada sem dígito |

**Por que o defeito passou pela suíte:** já existia um caso cobrindo a edição — mas assertava com
`expect.objectContaining({ objeto })` e **nunca olhava `cnaesAlvo`**. O campo quebrado estava fora da
asserção. Os casos novos asseram sobre o CNAE de propósito.

## 7. Risco e rollback

Risco baixo: mudança de normalização na borda de saída, sem alterar contrato de API, schema ou dado
gravado. Reverter o commit desfaz por completo.

## 8. Rastreabilidade

- **UC003** (gestão de editais) · **RF007** · **RF021** (subclasse CNAE de 7 dígitos) · **RN001** (match
  fornecedor × edital por subclasse exata).
- Decisão registrada em `.github/agents/memoria/MEMORIA-PROJETO.md` (**PRJ-DEC-22**).
