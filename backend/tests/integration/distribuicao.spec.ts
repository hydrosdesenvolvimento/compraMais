import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutarDistribuicao, EditalNaoDistribuivel, EditalNaoEncontrado, type EditalParaDistribuir } from '../../src/distribuicao/application/executar-distribuicao.js';
import { DistribuicaoRepositoryMemory } from '../../src/distribuicao/adapters/distribuicao-repository-memory.js';
import { CredenciamentoRepositoryMemory } from '../../src/credenciamento/adapters/credenciamento-repository-memory.js';
import { Credenciamento } from '../../src/credenciamento/domain/credenciamento.js';
import type { FornecedorRepository } from '../../src/catalogo/application/fornecedor-repository.js';
import { SemAptos } from '../../src/distribuicao/domain/motor.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

/**
 * Wiring do Motor de Distribuição (Épico 5 / UC008, Stories 5.1+5.2) no nível de aplicação: reúne os
 * credenciados `aceito` como aptos, roda o kernel puro e persiste a matriz canônica append-only.
 */
describe('ExecutarDistribuicao (Épico 5 — wiring do motor)', () => {
  let creds: CredenciamentoRepositoryMemory; let repo: DistribuicaoRepositoryMemory; let bus: InMemoryEventBus;
  const EDITAL = 'e1';
  const actor = { userId: 'gestor1' };

  // Stub do fornecedor: só o CNPJ é lido (desempate secundário).
  const fornecedores = {
    porId: async (id: string) => ({ cnpj: { valor: id === 'fA' ? '11111111111111' : '22222222222222' } }),
  } as unknown as FornecedorRepository;

  const editalDistribuivel: EditalParaDistribuir = { porId: async () => ({ podeDistribuir: true, quantitativos: 10 }) };

  async function aceitar(id: string, fornecedorId: string, teto: number): Promise<void> {
    const c = Credenciamento.iniciar({ id, fornecedorId, editalId: EDITAL, capacidadeTeto: teto });
    c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    await creds.salvar(c);
  }

  beforeEach(() => { creds = new CredenciamentoRepositoryMemory(); repo = new DistribuicaoRepositoryMemory(); bus = new InMemoryEventBus(); });

  it('distribui a demanda entre os aptos respeitando o teto e persiste a matriz', async () => {
    await aceitar('c1', 'fA', 10);
    await aceitar('c2', 'fB', 10);
    const eventos: string[] = [];
    bus.subscribe('DistribuicaoExecutada', async () => { eventos.push('DistribuicaoExecutada'); });

    const uc = new ExecutarDistribuicao(editalDistribuivel, creds, fornecedores, repo, bus);
    const reg = await uc.executar(EDITAL, actor);

    expect(reg.alocacoes).toEqual([{ fornecedorId: 'fA', cota: 5 }, { fornecedorId: 'fB', cota: 5 }]);
    expect(reg.quantidadeDistribuida).toBe(10);
    expect(reg.versao).toBe(1);
    expect(await repo.ultimaDoEdital(EDITAL)).toMatchObject({ versao: 1, hash: reg.hash });
    expect(eventos).toEqual(['DistribuicaoExecutada']); // trilha AD-18
  });

  it('só conta credenciados `aceito` — um `iniciado` é ignorado', async () => {
    await aceitar('c1', 'fA', 10);
    const iniciado = Credenciamento.iniciar({ id: 'c2', fornecedorId: 'fB', editalId: EDITAL, capacidadeTeto: 10 });
    await creds.salvar(iniciado); // fica em `iniciado`, não entra no rateio
    const uc = new ExecutarDistribuicao(editalDistribuivel, creds, fornecedores, repo, bus);
    const reg = await uc.executar(EDITAL, actor);
    expect(reg.alocacoes).toEqual([{ fornecedorId: 'fA', cota: 10 }]); // fA leva tudo (único apto)
  });

  it('guarda AD-37: edital fora de `em_distribuicao` → EditalNaoDistribuivel', async () => {
    await aceitar('c1', 'fA', 10);
    const editalAberto: EditalParaDistribuir = { porId: async () => ({ podeDistribuir: false, quantitativos: 10 }) };
    const uc = new ExecutarDistribuicao(editalAberto, creds, fornecedores, repo, bus);
    await expect(uc.executar(EDITAL, actor)).rejects.toBeInstanceOf(EditalNaoDistribuivel);
  });

  it('edital inexistente → EditalNaoEncontrado', async () => {
    const semEdital: EditalParaDistribuir = { porId: async () => null };
    const uc = new ExecutarDistribuicao(semEdital, creds, fornecedores, repo, bus);
    await expect(uc.executar(EDITAL, actor)).rejects.toBeInstanceOf(EditalNaoEncontrado);
  });

  it('sem aptos (nenhum aceito) → SemAptos (o motor barra)', async () => {
    const uc = new ExecutarDistribuicao(editalDistribuivel, creds, fornecedores, repo, bus);
    await expect(uc.executar(EDITAL, actor)).rejects.toBeInstanceOf(SemAptos);
  });

  it('append-only: reexecutar acrescenta uma nova versão e a matriz vigente é a última', async () => {
    await aceitar('c1', 'fA', 10);
    await aceitar('c2', 'fB', 10);
    const uc = new ExecutarDistribuicao(editalDistribuivel, creds, fornecedores, repo, bus);
    const v1 = await uc.executar(EDITAL, actor);
    const v2 = await uc.executar(EDITAL, actor);
    expect(v1.versao).toBe(1); expect(v2.versao).toBe(2);
    expect(await repo.contarDoEdital(EDITAL)).toBe(2);
    expect((await repo.ultimaDoEdital(EDITAL))?.versao).toBe(2);
    expect(v1.hash).toBe(v2.hash); // mesma entrada → mesmo conteúdo/hash (só a versão de linha muda)
  });

  it('cotasDoFornecedor lê a cota vigente do fornecedor (Demandas distribuídas)', async () => {
    await aceitar('c1', 'fA', 3);
    await aceitar('c2', 'fB', 10);
    const uc = new ExecutarDistribuicao(editalDistribuivel, creds, fornecedores, repo, bus);
    await uc.executar(EDITAL, actor); // fA teto 3 → 3; fB → 7
    const cotasA = await repo.cotasDoFornecedor('fA');
    expect(cotasA).toEqual([{ editalId: EDITAL, cota: 3, geradoEm: expect.any(String), hash: expect.any(String) }]);
  });
});
