import { describe, it, expect, beforeEach } from 'vitest';
import { GerirConta, FornecedorNaoEncontrado } from '../../src/catalogo/application/gerir-conta.js';
import { Fornecedor, type SituacaoCadastral } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { ReceitaGateway, ResultadoProveniente, DadosCnpj } from '../../src/shared/acl/receita/receita-gateway.js';

// UC018 — Re-sincronizar dados do CNPJ. Exercita o caso de uso com repo em memória + Receita fake
// (verificada com situação parametrizável / indisponível). A integração real usa Testcontainers no CI.

const CNPJ = '11.222.333/0001-81';
const TS_NOVO = '2026-07-06T09:00:00Z';

function receitaFake(
  frescor: ResultadoProveniente<DadosCnpj>['frescor'],
  situacao: SituacaoCadastral = 'ativa',
): ReceitaGateway {
  return {
    async consultarCnpj() {
      const valor: DadosCnpj | null = frescor === 'verificado'
        ? {
          razaoSocial: 'Confecções Vale do Acre Ltda (atualizada)', porte: 'EPP',
          cnaes: [{ codigoSubclasse: '4721102', tipo: 'principal' }],
          situacaoCadastral: situacao,
        }
        : null;
      return { valor, fonte: 'Receita', timestamp: TS_NOVO, frescor };
    },
  };
}

const actor = { userId: 'u-titular' };

describe('GerirConta.reSincronizar (UC018 — integração, adaptadores em memória)', () => {
  let repo: FornecedorRepositoryMemory;

  beforeEach(async () => {
    repo = new FornecedorRepositoryMemory();
    await repo.salvar(Fornecedor.cadastrar({
      id: 'f1', cnpj: Cnpj.criar(CNPJ), razaoSocial: 'Confecções Vale do Acre Ltda', porte: 'ME',
      cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
      situacao: 'ativa', origem: 'oficial', contato: { nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000' },
      sincronizadoEm: '2026-06-01T00:00:00Z',
    }));
  });

  function novo(receita: ReceitaGateway) {
    return new GerirConta(repo, receita, new InMemoryEventBus());
  }

  it('sucesso: atualiza campos oficiais, grava novo timestamp e devolve {status,quando,fonte} (RF018/Story 1.6)', async () => {
    const out = await novo(receitaFake('verificado')).reSincronizar('f1', actor);
    expect(out).toEqual({ status: 'sucesso', quando: TS_NOVO, fonte: 'Receita' });
    const f = await repo.porId('f1');
    expect(f?.razaoSocial).toBe('Confecções Vale do Acre Ltda (atualizada)');
    expect(f?.porte).toBe('EPP');
    expect(f?.cnaes[0]?.codigoSubclasse).toBe('4721102');
    expect(f?.sincronizadoEm).toBe(TS_NOVO); // novo timestamp gravado (UC018 passo 3)
  });

  it('preserva os campos editáveis do fornecedor (RN009): Nome Fantasia e Telefone', async () => {
    await novo(receitaFake('verificado')).reSincronizar('f1', actor);
    const f = await repo.porId('f1');
    expect(f?.contato.nomeFantasia).toBe('Vale do Acre');
    expect(f?.contato.telefone).toBe('(68) 3333-0000');
  });

  it('A1 — Receita indisponível: mantém os dados atuais e sinaliza erro sem sobrescrever', async () => {
    const out = await novo(receitaFake('indisponivel')).reSincronizar('f1', actor);
    expect(out.status).toBe('erro');
    expect(out.quando).toBeUndefined();
    const f = await repo.porId('f1');
    expect(f?.razaoSocial).toBe('Confecções Vale do Acre Ltda'); // inalterado
    expect(f?.sincronizadoEm).toBe('2026-06-01T00:00:00Z'); // timestamp preservado
  });

  it('exceção UC018 — CNPJ tornou-se baixado/inativo: atualiza dados e sinaliza revisão da CPL', async () => {
    const out = await novo(receitaFake('verificado', 'baixada')).reSincronizar('f1', actor);
    expect(out.status).toBe('revisao');
    expect(out.quando).toBe(TS_NOVO);
    const f = await repo.porId('f1');
    expect(f?.situacao).toBe('baixada');
    expect(f?.precisaRevisaoCpl()).toBe(true);
  });

  it('audita a re-sincronização com o status resolvido (FornecedorSincronizado)', async () => {
    const bus = new InMemoryEventBus();
    const eventos: string[] = [];
    bus.subscribe('FornecedorSincronizado', async (e) => { eventos.push((e.payload as { status: string }).status); });
    await new GerirConta(repo, receitaFake('verificado', 'suspensa'), bus).reSincronizar('f1', actor);
    expect(eventos).toEqual(['revisao']);
  });

  it('fornecedor inexistente → FornecedorNaoEncontrado (borda mapeia 404, nunca 500)', async () => {
    await expect(novo(receitaFake('verificado')).reSincronizar('nao-existe', actor)).rejects.toBeInstanceOf(FornecedorNaoEncontrado);
  });

  describe('obterPerfil (UC018 passo 1 — "Minha conta")', () => {
    it('devolve os dados oficiais + contato + última sincronização', async () => {
      const perfil = await novo(receitaFake('verificado')).obterPerfil('f1');
      expect(perfil).toMatchObject({
        id: 'f1', razaoSocial: 'Confecções Vale do Acre Ltda', porte: 'ME', situacao: 'ativa',
        status: 'requerente', sincronizadoEm: '2026-06-01T00:00:00Z',
        nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000',
      });
      expect(perfil.cnpj).toBe(CNPJ);
      expect(perfil.cnaes[0]?.codigoSubclasse).toBe('1412601');
    });

    it('fornecedor inexistente → FornecedorNaoEncontrado', async () => {
      await expect(novo(receitaFake('verificado')).obterPerfil('nao-existe')).rejects.toBeInstanceOf(FornecedorNaoEncontrado);
    });
  });
});
