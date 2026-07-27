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

/** Endereço oficial devolvido pela Receita nos casos que exercitam RF019. */
const END_RECEITA = {
  logradouro: 'Rua Benjamin Constant', numero: '100', complemento: '',
  bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062',
} as const;

function receitaFake(
  frescor: ResultadoProveniente<DadosCnpj>['frescor'],
  situacao: SituacaoCadastral = 'ativa',
  endereco?: DadosCnpj['endereco'],
): ReceitaGateway {
  return {
    async consultarCnpj() {
      const valor: DadosCnpj | null = frescor === 'verificado'
        ? {
          razaoSocial: 'Confecções Vale do Acre Ltda (atualizada)', porte: 'EPP',
          cnaes: [{ codigoSubclasse: '4721102', tipo: 'principal' }],
          situacaoCadastral: situacao,
          ...(endereco ? { endereco } : {}),
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

  /**
   * RF019 — o endereço oficial vinha da Receita e era DESCARTADO pelo caso de uso: um fornecedor
   * cadastrado manualmente (sem endereço) continuava sem endereço depois de sincronizar. A política
   * é preencher CAMPO A CAMPO o que estiver vazio e nunca sobrescrever o que já foi informado
   * (endereço é editável — RN009 —, e o da Receita é o fiscal, que pode diferir do de correspondência).
   */
  describe('endereço oficial na re-sincronização (RF019)', () => {
    /** Substitui o fornecedor semeado por um sem endereço nenhum (cenário do cadastro manual). */
    async function semEndereco(): Promise<void> {
      await repo.salvar(Fornecedor.cadastrar({
        id: 'f2', cnpj: Cnpj.criar('04.252.011/0001-10'), razaoSocial: 'Manual Ltda', porte: 'ME',
        cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
        situacao: 'ativa', origem: 'manual', contato: { nomeFantasia: 'Manual' },
      }));
    }

    it('fornecedor manual sem endereço recebe o endereço completo da Receita', async () => {
      await semEndereco();
      await novo(receitaFake('verificado', 'ativa', END_RECEITA)).reSincronizar('f2', actor);
      const f = await repo.porId('f2');
      expect(f?.contato.endereco).toMatchObject({
        logradouro: 'Rua Benjamin Constant', numero: '100', bairro: 'Centro',
        cidade: 'Rio Branco', uf: 'AC', cep: '69900062',
      });
    });

    it('preenche só os campos vazios e preserva os que o operador já informou', async () => {
      await semEndereco();
      const f0 = await repo.porId('f2');
      // Operador preencheu parcialmente: número próprio e complemento; o resto em branco.
      f0!.editarContato({ endereco: { logradouro: '', numero: '250', complemento: 'Sala 3', bairro: '', cidade: '', uf: '', cep: '' } });
      await repo.salvar(f0!);

      await novo(receitaFake('verificado', 'ativa', END_RECEITA)).reSincronizar('f2', actor);
      const f = await repo.porId('f2');
      expect(f?.contato.endereco).toMatchObject({
        logradouro: 'Rua Benjamin Constant', // vazio → veio da Receita
        numero: '250',                        // preenchido → preservado
        complemento: 'Sala 3',                // preenchido → preservado (Receita manda vazio)
        bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062',
      });
    });

    it('endereço já completo não é tocado — sincronizar não apaga o de correspondência', async () => {
      await semEndereco();
      const proprio = { logradouro: 'Av. Ceará', numero: '1200', complemento: 'Sala 3', bairro: 'Bosque', cidade: 'Rio Branco', uf: 'AC', cep: '69900500' };
      const f0 = await repo.porId('f2');
      f0!.editarContato({ endereco: proprio });
      await repo.salvar(f0!);

      await novo(receitaFake('verificado', 'ativa', END_RECEITA)).reSincronizar('f2', actor);
      const f = await repo.porId('f2');
      expect(f?.contato.endereco).toEqual(proprio);
    });

    it('preserva latitude/longitude já geocodificadas (a Receita não as fornece)', async () => {
      await semEndereco();
      const f0 = await repo.porId('f2');
      f0!.editarContato({ endereco: { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '', latitude: -9.97, longitude: -67.8 } });
      await repo.salvar(f0!);

      await novo(receitaFake('verificado', 'ativa', END_RECEITA)).reSincronizar('f2', actor);
      const f = await repo.porId('f2');
      expect(f?.contato.endereco).toMatchObject({ logradouro: 'Rua Benjamin Constant', latitude: -9.97, longitude: -67.8 });
    });

    it('Receita sem endereço: o cadastro segue sem endereço, sem quebrar a sincronização', async () => {
      await semEndereco();
      const out = await novo(receitaFake('verificado')).reSincronizar('f2', actor);
      expect(out.status).toBe('sucesso');
      expect((await repo.porId('f2'))?.contato.endereco).toBeUndefined();
    });

    it('audita "endereco" em camposAtualizados apenas quando o endereço realmente mudou', async () => {
      await semEndereco();
      const campos = async (r: ReceitaGateway, id: string): Promise<string[]> => {
        const bus = new InMemoryEventBus();
        let out: string[] = [];
        bus.subscribe('FornecedorSincronizado', async (e) => { out = (e.payload as { camposAtualizados: string[] }).camposAtualizados; });
        await new GerirConta(repo, r, bus).reSincronizar(id, actor);
        return out;
      };

      expect(await campos(receitaFake('verificado', 'ativa', END_RECEITA), 'f2')).toContain('endereco');
      // Segunda passada: o endereço já está completo, nada muda → não consta da trilha.
      expect(await campos(receitaFake('verificado', 'ativa', END_RECEITA), 'f2')).not.toContain('endereco');
    });
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
