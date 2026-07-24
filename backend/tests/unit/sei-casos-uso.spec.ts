import { describe, it, expect, beforeEach } from 'vitest';
import { Malote, type Peca } from '../../src/malote/domain/malote.js';
import { MaloteRepositoryMemory } from '../../src/malote/adapters/malote-repository-memory.js';
import { EnviarMaloteSei } from '../../src/malote/application/enviar-malote-sei.js';
import { ConsultarProcessoSei } from '../../src/sei/application/consultar-processo-sei.js';
import { SeiMockGateway } from '../../src/shared/acl/sei/sei-mock-gateway.js';
import type { SeiGateway, ResultadoSei, ProcessoSei, ProcessoCriadoSei } from '../../src/shared/acl/sei/sei-gateway.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

const actor = { userId: 'cpl1' };
const PECAS: Peca[] = [{ tipo: 'cnpj', ref: 'r1', tamanhoBytes: 10 }];

/** Gateway que reporta o SEI indisponível (fail-open) — para o caminho de erro dos casos de uso. */
const seiIndisponivel: SeiGateway = {
  async pesquisarProcesso(): Promise<ResultadoSei<ProcessoSei>> { return { valor: null, fonte: 'SEI', timestamp: 'x', frescor: 'indisponivel' }; },
  async criarProcesso(): Promise<ResultadoSei<ProcessoCriadoSei>> { return { valor: null, fonte: 'SEI', timestamp: 'x', frescor: 'indisponivel' }; },
};

describe('EnviarMaloteSei (push)', () => {
  let repo: MaloteRepositoryMemory;
  let bus: InMemoryEventBus;

  beforeEach(() => { repo = new MaloteRepositoryMemory(); bus = new InMemoryEventBus(); });

  async function maloteGerado(): Promise<string> {
    const m = Malote.criar({ id: 'm1', fornecedorId: 'f1', editalId: 'e1', limiteBytes: 1000 });
    m.montar(PECAS);
    await repo.salvar(m);
    return m.id;
  }

  it('cria o processo no SEI, grava o protocolo e marca o malote exportado', async () => {
    const id = await maloteGerado();
    const uc = new EnviarMaloteSei(repo, new SeiMockGateway(), bus);
    const r = await uc.executar(id, actor);
    expect(r.numeroProcesso).toMatch(/^\d{4}\.\d{6}\.\d{5}\/\d{4}-\d{2}$/);
    expect(r.jaProtocolado).toBe(false);

    const m = await repo.porId(id);
    expect(m!.status).toBe('exportado');
    expect(m!.protocoloSei?.numeroProcesso).toBe(r.numeroProcesso);
  });

  it('é idempotente: reenviar não cria novo processo e devolve o mesmo protocolo', async () => {
    const id = await maloteGerado();
    const uc = new EnviarMaloteSei(repo, new SeiMockGateway(), bus);
    const primeiro = await uc.executar(id, actor);
    const segundo = await uc.executar(id, actor);
    expect(segundo.jaProtocolado).toBe(true);
    expect(segundo.numeroProcesso).toBe(primeiro.numeroProcesso);
  });

  it('SEI indisponível (fail-open): não grava nada e lança SeiIndisponivel', async () => {
    const id = await maloteGerado();
    const uc = new EnviarMaloteSei(repo, seiIndisponivel, bus);
    await expect(uc.executar(id, actor)).rejects.toMatchObject({ name: 'SeiIndisponivel' });
    const m = await repo.porId(id);
    expect(m!.status).toBe('gerado'); // permanece gerado, sem protocolo
    expect(m!.protocoloSei).toBeNull();
  });

  it('malote apenas pendente (não gerado) → MaloteNaoGeradoParaSei', async () => {
    const m = Malote.criar({ id: 'm2', fornecedorId: 'f1', editalId: 'e1', limiteBytes: 1000 });
    await repo.salvar(m);
    const uc = new EnviarMaloteSei(repo, new SeiMockGateway(), bus);
    await expect(uc.executar('m2', actor)).rejects.toMatchObject({ name: 'MaloteNaoGeradoParaSei' });
  });

  it('malote inexistente → MaloteNaoEncontrado', async () => {
    const uc = new EnviarMaloteSei(repo, new SeiMockGateway(), bus);
    await expect(uc.executar('nao-existe', actor)).rejects.toMatchObject({ name: 'MaloteNaoEncontrado' });
  });
});

describe('ConsultarProcessoSei (pull)', () => {
  it('consulta um processo pesquisável e devolve seus documentos', async () => {
    const gw = new SeiMockGateway();
    gw.semear({ idProtocolo: '23351546', numero: '4004.017444.00012/2026-02', documentos: [{ idDocumento: '999001', titulo: 'Doc 1' }] });
    const view = await new ConsultarProcessoSei(gw).consultar('4004.017444.00012/2026-02');
    expect(view.idProtocolo).toBe('23351546');
    expect(view.documentos[0]).toMatchObject({ idDocumento: '999001', titulo: 'Doc 1' });
  });

  it('número em formato inválido → NumeroProcessoInvalido', async () => {
    await expect(new ConsultarProcessoSei(new SeiMockGateway()).consultar('123')).rejects.toMatchObject({ name: 'NumeroProcessoInvalido' });
  });

  it('SEI indisponível → SeiConsultaIndisponivel (fail-open)', async () => {
    await expect(new ConsultarProcessoSei(seiIndisponivel).consultar('4004.017444.00012/2026-02'))
      .rejects.toMatchObject({ name: 'SeiConsultaIndisponivel' });
  });
});
