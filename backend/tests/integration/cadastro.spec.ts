import { describe, it, expect, beforeEach } from 'vitest';
import { CadastrarFornecedor, ReceitaIndisponivelSemManual } from '../../src/catalogo/application/cadastrar-fornecedor.js';
import { CnpjJaCadastrado } from '../../src/catalogo/application/fornecedor-repository.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { ReceitaGateway, ResultadoProveniente, DadosCnpj } from '../../src/shared/acl/receita/receita-gateway.js';

// NOTA: integração real usa Testcontainers (Postgres). Aqui exercita o caso de uso com adaptadores
// em memória + Receita fake (verificada/indisponível). Substituir o repo memory pelo pg no CI.

function receitaFake(frescor: ResultadoProveniente<DadosCnpj>['frescor']): ReceitaGateway {
  return {
    async consultarCnpj() {
      const valor: DadosCnpj | null = frescor === 'verificado'
        ? { razaoSocial: 'Padaria X', porte: 'ME', cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal' }], situacaoCadastral: 'ativa' }
        : null;
      return { valor, fonte: 'Receita', timestamp: '2026-06-29T00:00:00Z', frescor };
    },
  };
}

const cons = { salvar: async () => {} };
const contas = { salvar: async () => {} };
const input = {
  cnpjRaw: '12.345.678/0001-90',
  contato: {},
  consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
  titular: { identificador: 'raimundo@padaria.com' },
};

describe('CadastrarFornecedor (integração — adaptadores em memória)', () => {
  let repo: FornecedorRepositoryMemory;
  beforeEach(() => { repo = new FornecedorRepositoryMemory(); });

  it('happy path: autopreenche e cria fornecedor ativo', async () => {
    const uc = new CadastrarFornecedor(repo, cons, contas, receitaFake('verificado'), new InMemoryEventBus());
    const out = await uc.executar(input);
    expect(out.origem).toBe('oficial');
    expect(out.pendenteCovalidacao).toBe(false);
  });

  it('fallback manual quando Receita indisponível (FR-003)', async () => {
    const uc = new CadastrarFornecedor(repo, cons, contas, receitaFake('indisponivel'), new InMemoryEventBus());
    const out = await uc.executar({ ...input, manual: { razaoSocial: 'Padaria X', porte: 'ME', cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal', ativo: true }] } });
    expect(out.origem).toBe('manual');
    expect(out.pendenteCovalidacao).toBe(true);
  });

  it('indisponível sem dados manuais → erro orientado', async () => {
    const uc = new CadastrarFornecedor(repo, cons, contas, receitaFake('indisponivel'), new InMemoryEventBus());
    await expect(uc.executar(input)).rejects.toBeInstanceOf(ReceitaIndisponivelSemManual);
  });

  it('CNPJ duplicado → 409 (FR-004)', async () => {
    const uc = new CadastrarFornecedor(repo, cons, contas, receitaFake('verificado'), new InMemoryEventBus());
    await uc.executar(input);
    await expect(uc.executar(input)).rejects.toBeInstanceOf(CnpjJaCadastrado);
  });
});
