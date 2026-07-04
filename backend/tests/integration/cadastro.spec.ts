import { describe, it, expect, beforeEach } from 'vitest';
import { CadastrarFornecedor, ReceitaIndisponivelSemManual, type RegistroLogin } from '../../src/catalogo/application/cadastrar-fornecedor.js';
import { CnpjJaCadastrado } from '../../src/catalogo/application/fornecedor-repository.js';
import { Cnpj, CnpjInvalido } from '../../src/catalogo/domain/cnpj.js';
import { SituacaoNaoApta, type SituacaoCadastral } from '../../src/catalogo/domain/fornecedor.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { EmailJaCadastrado } from '../../src/shared/identity/autenticacao.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { ReceitaGateway, ResultadoProveniente, DadosCnpj } from '../../src/shared/acl/receita/receita-gateway.js';

// NOTA: integração real usa Testcontainers (Postgres). Aqui exercita o caso de uso com adaptadores
// em memória + Receita fake (verificada/indisponível). Substituir o repo memory pelo pg no CI.

const CNPJ = '11.222.333/0001-81'; // matematicamente válido

function receitaFake(
  frescor: ResultadoProveniente<DadosCnpj>['frescor'],
  situacao: SituacaoCadastral = 'ativa',
): ReceitaGateway {
  return {
    async consultarCnpj() {
      const valor: DadosCnpj | null = frescor === 'verificado'
        ? {
          razaoSocial: 'Padaria X', porte: 'ME',
          cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal' }],
          situacaoCadastral: situacao,
          endereco: { logradouro: 'Rua A', numero: '100', complemento: '', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' },
        }
        : null;
      return { valor, fonte: 'Receita', timestamp: '2026-06-29T00:00:00Z', frescor };
    },
  };
}

/** Login fake: registra e-mails e recusa duplicados (como RegistrarUsuario). */
function loginFake(): RegistroLogin & { emails: string[] } {
  const emails: string[] = [];
  return {
    emails,
    async executar(input) {
      if (emails.includes(input.email)) throw new EmailJaCadastrado();
      emails.push(input.email);
      return { usuarioId: `u-${emails.length}` };
    },
  };
}

const cons = { salvar: async () => {} };
const contas = { salvar: async () => {} };
const input = {
  cnpjRaw: CNPJ,
  contato: {},
  consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
  titular: { identificador: 'raimundo@padaria.com' },
  senha: 'segredo12',
};

describe('CadastrarFornecedor (UC001 — integração, adaptadores em memória)', () => {
  let repo: FornecedorRepositoryMemory;
  beforeEach(() => { repo = new FornecedorRepositoryMemory(); });

  function novo(receita: ReceitaGateway, login = loginFake()) {
    return { uc: new CadastrarFornecedor(repo, cons, contas, receita, login, new InMemoryEventBus()), login };
  }

  it('happy path: autopreenche, cria login e nasce Requerente', async () => {
    const { uc, login } = novo(receitaFake('verificado'));
    const out = await uc.executar(input);
    expect(out.origem).toBe('oficial');
    expect(out.status).toBe('requerente');
    expect(out.pendenteCovalidacao).toBe(false);
    expect(login.emails).toContain('raimundo@padaria.com'); // conta de login criada (passo 4)
  });

  it('persiste endereço estruturado e o timestamp de sincronização (RF018/RF019)', async () => {
    const { uc } = novo(receitaFake('verificado'));
    const { fornecedorId } = await uc.executar(input);
    const f = await repo.porId(fornecedorId);
    expect(f?.contato.endereco?.cidade).toBe('Rio Branco');
    expect(f?.sincronizadoEm).toBe('2026-06-29T00:00:00Z');
  });

  it('fallback manual quando Receita indisponível (A1)', async () => {
    const { uc } = novo(receitaFake('indisponivel'));
    const out = await uc.executar({ ...input, manual: { razaoSocial: 'Padaria X', porte: 'ME', cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal', ativo: true }] } });
    expect(out.origem).toBe('manual');
    expect(out.pendenteCovalidacao).toBe(true);
  });

  it('indisponível sem dados manuais → erro orientado', async () => {
    const { uc } = novo(receitaFake('indisponivel'));
    await expect(uc.executar(input)).rejects.toBeInstanceOf(ReceitaIndisponivelSemManual);
  });

  it('CNPJ inválido matematicamente → bloqueado (exceção UC001)', async () => {
    const { uc } = novo(receitaFake('verificado'));
    await expect(uc.executar({ ...input, cnpjRaw: '12.345.678/0001-90' })).rejects.toBeInstanceOf(CnpjInvalido);
  });

  it('situação cadastral não-ativa → bloqueada (pré-condição UC001)', async () => {
    const { uc } = novo(receitaFake('verificado', 'baixada'));
    await expect(uc.executar(input)).rejects.toBeInstanceOf(SituacaoNaoApta);
  });

  it('CNPJ duplicado → 409', async () => {
    const { uc } = novo(receitaFake('verificado'));
    await uc.executar(input);
    await expect(uc.executar(input)).rejects.toBeInstanceOf(CnpjJaCadastrado);
  });

  it('e-mail de login já cadastrado → bloqueado antes de persistir o fornecedor', async () => {
    const login = loginFake();
    login.emails.push('raimundo@padaria.com');
    const uc = new CadastrarFornecedor(repo, cons, contas, receitaFake('verificado'), login, new InMemoryEventBus());
    await expect(uc.executar(input)).rejects.toBeInstanceOf(EmailJaCadastrado);
    expect(await repo.porCnpj(Cnpj.criar(CNPJ))).toBeNull(); // não persistiu o fornecedor
  });
});
