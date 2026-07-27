import { describe, it, expect, beforeEach } from 'vitest';
import { Fornecedor, FornecedorAnonimizado } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { SolicitacaoTitular, PoliticaRetencao, type TipoDireito } from '../../src/titular/domain/solicitacao-titular.js';
import { SolicitacaoRepositoryMemory } from '../../src/titular/adapters/solicitacao-repository-memory.js';
import { DescarteRetido } from '../../src/titular/application/gerir-direitos.js';
import {
  ExecutarExclusaoFornecedor, SolicitacaoNaoEhExclusao, TitularSemFornecedor, SolicitacaoJaResolvida,
  type ResumoPurga,
} from '../../src/titular/application/executar-exclusao-fornecedor.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * UC017 / LGPD art. 18, V — execução do direito de eliminação sobre o cadastro do fornecedor.
 *
 * Dois desfechos, decididos pelo HISTÓRICO de participação no processo de compras: sem histórico o
 * cadastro é apagado; com histórico é anonimizado (o registro da participação e o ato administrativo
 * publicado precisam sobreviver — LGPD art. 16, I). Guardas contra fakes das portas.
 */
describe('ExecutarExclusaoFornecedor (UC017 / LGPD art. 18, V)', () => {
  const HOJE = '2026-07-26T12:00:00.000Z';
  const ANTIGO = '2019-01-01T00:00:00.000Z'; // > 5 anos: fora de qualquer prazo de retenção
  const TITULAR = 'u-titular';
  const FORNECEDOR = 'f1';
  const actor = { userId: 'dpo-1' };

  let solicitacoes: SolicitacaoRepositoryMemory;
  let fornecedores: FornecedorRepositoryMemory;
  let bus: InMemoryEventBus;
  let comHistorico: boolean;
  let purgado: string[];
  let apagado: string[];
  let eventos: Array<{ nome: string; payload: Record<string, unknown> }>;

  const RESUMO: ResumoPurga = { documentos: 3, contas: 2, usuarios: 2, consentimentos: 1, biometria: true };

  beforeEach(async () => {
    solicitacoes = new SolicitacaoRepositoryMemory();
    fornecedores = new FornecedorRepositoryMemory();
    bus = new InMemoryEventBus();
    comHistorico = false;
    purgado = [];
    apagado = [];
    eventos = [];
    bus.subscribe('FornecedorExcluidoLgpd', async (e) => { eventos.push({ nome: e.eventName, payload: e.payload as Record<string, unknown> }); });
    await semearFornecedor(ANTIGO);
  });

  async function semearFornecedor(registro: string): Promise<void> {
    const f = Fornecedor.cadastrar({
      id: FORNECEDOR, cnpj: Cnpj.criar('11.222.333/0001-81'), razaoSocial: 'Confecções Vale do Acre Ltda',
      porte: 'ME', cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
      situacao: 'ativa', origem: 'oficial',
      contato: { nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000', endereco: { logradouro: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900000' } },
    });
    // A data de registro é a base da contagem de retenção; o agregado a define no construtor.
    const estado = f.estado();
    await fornecedores.salvar(Fornecedor.deEstado({ ...estado, meta: { ...estado.meta, registerDate: registro } }));
  }

  async function pedido(tipo: TipoDireito = 'exclusao'): Promise<string> {
    const s = SolicitacaoTitular.solicitar({ id: `s-${tipo}`, titularId: TITULAR, tipo, categoria: 'cadastral' });
    await solicitacoes.salvar(s);
    return s.id;
  }

  function novo(titularMapeadoPara: string | null = FORNECEDOR): ExecutarExclusaoFornecedor {
    return new ExecutarExclusaoFornecedor(
      solicitacoes,
      { fornecedorDe: async () => titularMapeadoPara },
      fornecedores,
      { possuiHistorico: async () => comHistorico },
      {
        purgarDadosPessoais: async (id) => { purgado.push(id); return RESUMO; },
        apagarCadastro: async (id) => { apagado.push(id); await fornecedores.remover(id); return RESUMO; },
      },
      bus,
      new PoliticaRetencao({ cadastral: 730, fiscal: 1825, contratual: 1825 }),
      () => HOJE,
    );
  }

  it('sem histórico de participação: apaga o cadastro por completo', async () => {
    const id = await pedido();
    const out = await novo().executar(id, actor);

    expect(out.modo).toBe('excluido');
    expect(apagado).toEqual([FORNECEDOR]);
    expect(await fornecedores.porId(FORNECEDOR)).toBeNull();
  });

  it('com histórico: anonimiza — apaga o contato e PRESERVA CNPJ e razão social', async () => {
    comHistorico = true;
    const id = await pedido();
    const out = await novo().executar(id, actor);

    expect(out.modo).toBe('anonimizado');
    expect(purgado).toEqual([FORNECEDOR]);

    const f = await fornecedores.porId(FORNECEDOR);
    expect(f).not.toBeNull();
    expect(f!.contato).toEqual({});                                  // telefone/endereço/nome fantasia eliminados
    expect(f!.cnpj.valor).toBe('11.222.333/0001-81');                // dado de pessoa jurídica — mantido
    expect(f!.razaoSocial).toBe('Confecções Vale do Acre Ltda');     // idem (ato administrativo publicado)
    expect(f!.anonimizado).toBe(true);
    expect(f!.anonimizadoEm).toBe(HOJE);
  });

  it('cadastro anonimizado não volta a ser editável (RN009 + LGPD)', async () => {
    comHistorico = true;
    await novo().executar(await pedido(), actor);
    const f = await fornecedores.porId(FORNECEDOR);
    expect(() => f!.editarContato({ telefone: '(68) 90000-0000' })).toThrow(FornecedorAnonimizado);
  });

  it('retenção legal em curso → DescarteRetido, e NADA é apagado (LGPD art. 16, I)', async () => {
    await semearFornecedor('2026-07-01T00:00:00.000Z'); // cadastrado há dias
    const id = await pedido();

    await expect(novo().executar(id, actor)).rejects.toBeInstanceOf(DescarteRetido);
    expect(purgado).toEqual([]);
    expect(apagado).toEqual([]);
    expect(await fornecedores.porId(FORNECEDOR)).not.toBeNull();
    expect((await solicitacoes.porId(id))!.status).toBe('pendente'); // pedido segue aberto
  });

  it('pedido de acesso/correção não dispara eliminação → SolicitacaoNaoEhExclusao', async () => {
    const id = await pedido('acesso');
    await expect(novo().executar(id, actor)).rejects.toBeInstanceOf(SolicitacaoNaoEhExclusao);
    expect(purgado.concat(apagado)).toEqual([]);
  });

  it('titular sem fornecedor vinculado → TitularSemFornecedor', async () => {
    const id = await pedido();
    await expect(novo(null).executar(id, actor)).rejects.toBeInstanceOf(TitularSemFornecedor);
  });

  it('a solicitação é resolvida com a prestação de contas do que foi eliminado', async () => {
    comHistorico = true;
    const id = await pedido();
    await novo().executar(id, actor);

    const s = await solicitacoes.porId(id);
    expect(s!.status).toBe('atendida');
    expect(s!.resultado).toContain('3 document(s)');
    expect(s!.resultado).toContain('biometric reference');
    expect(s!.resultado).toContain('history preserved');
  });

  /**
   * Reexecutar precisa falhar ANTES de purgar de novo. O `atender()` do agregado também rejeita pedido
   * resolvido, mas só no fim do fluxo — quando a purga já teria rodado uma segunda vez.
   */
  it('não executa duas vezes, e a segunda tentativa não chega a purgar nada', async () => {
    comHistorico = true; // o fornecedor sobrevive à primeira execução (anonimizado)
    const id = await pedido();
    await novo().executar(id, actor);
    expect(purgado).toEqual([FORNECEDOR]);

    await expect(novo().executar(id, actor)).rejects.toBeInstanceOf(SolicitacaoJaResolvida);
    expect(purgado).toEqual([FORNECEDOR]); // continua com UMA purga só
  });

  it('a trilha registra QUANTO foi eliminado, nunca o dado eliminado (AD-18)', async () => {
    comHistorico = true;
    await novo().executar(await pedido(), actor);

    expect(eventos).toHaveLength(1);
    expect(eventos[0].payload).toMatchObject({
      fornecedorId: FORNECEDOR, modo: 'anonimizado', documentos: 3, contas: 2, biometria: true,
    });
    // Nenhum dado pessoal atravessa para a trilha append-only — que, por definição, nunca é apagada.
    const serializado = JSON.stringify(eventos[0].payload);
    expect(serializado).not.toContain('Vale do Acre');
    expect(serializado).not.toContain('3333-0000');
  });
});
