import { describe, it, expect, beforeEach } from 'vitest';
import { MaloteRepositoryMemory } from '../../src/malote/adapters/malote-repository-memory.js';
import { GerarMalote } from '../../src/malote/application/gerar-malote.js';
import { FilaMaloteMemory, type FilaMalote } from '../../src/malote/application/fila-malote.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { Peca } from '../../src/malote/domain/malote.js';

const pecas: Peca[] = [
  { tipo: 'certidao', ref: 'c1', tamanhoBytes: 100 },
  { tipo: 'cnpj', ref: 'cnpj1', tamanhoBytes: 100 },
];

describe('GerarMalote (Épico 6)', () => {
  let repo: MaloteRepositoryMemory; let bus: InMemoryEventBus; let uc: GerarMalote; const actor = { userId: 'cpl1' };
  beforeEach(() => {
    repo = new MaloteRepositoryMemory(); bus = new InMemoryEventBus();
    // fila síncrona e awaited para teste determinístico
    const fila: FilaMalote = { enfileirar: async (job) => { await uc.processarJob(job); } };
    uc = new GerarMalote(repo, bus, fila, 1024);
  });

  it('solicitar gera (fila durável) → status gerado, ordem legal', async () => {
    const { maloteId, status } = await uc.solicitar({ fornecedorId: 'f1', editalId: 'e1' }, pecas, actor);
    expect(status).toBe('pendente'); // resposta imediata; processado pela fila
    const m = await repo.porId(maloteId);
    expect(m?.status).toBe('gerado');
    expect(m?.pecas.map((p) => p.tipo)).toEqual(['cnpj', 'certidao']);
  });

  it('exportação idempotente emite evento só uma vez', async () => {
    let exportados = 0;
    bus.subscribe('MaloteExportado', async () => { exportados++; });
    const { maloteId } = await uc.solicitar({ fornecedorId: 'f1', editalId: 'e1' }, pecas, actor);
    await uc.exportar(maloteId, actor);
    await uc.exportar(maloteId, actor);
    expect(exportados).toBe(1);
  });

  it('QBE por fornecedor/status', async () => {
    await uc.solicitar({ fornecedorId: 'f1', editalId: 'e1' }, pecas, actor);
    await uc.solicitar({ fornecedorId: 'f2', editalId: 'e1' }, pecas, actor);
    const r = await uc.consultar({ fornecedorId: 'f1', status: 'gerado' });
    expect(r).toHaveLength(1);
    expect(r[0].fornecedorId).toBe('f1');
  });
});

describe('FilaMaloteMemory — durabilidade/retry (FR-002)', () => {
  it('reprocessa em falha até obter sucesso', async () => {
    let tentativas = 0;
    const tarefas: Array<() => Promise<void>> = []; // agendador coletor → drenagem determinística
    const fila = new FilaMaloteMemory(async () => {
      tentativas++;
      if (tentativas < 2) throw new Error('falha transitória');
    }, 3, (fn) => { tarefas.push(fn); });
    await fila.enfileirar({ maloteId: 'm1', pecas: [], actor: { userId: 'x' }, tentativas: 0 });
    while (tarefas.length) await tarefas.shift()!(); // 1ª tentativa falha → retry → 2ª sucede
    expect(tentativas).toBe(2);
  });
});
