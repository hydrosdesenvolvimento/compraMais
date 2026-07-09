import { describe, it, expect, beforeEach } from 'vitest';
import { VerificarElegibilidade } from '../../src/credenciamento/application/verificar-elegibilidade.js';
import { BloqueioRepositoryMemory } from '../../src/credenciamento/adapters/bloqueio-repository-memory.js';
import { Bloqueio } from '../../src/credenciamento/domain/bloqueio.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import type { DividaGateway, ResultadoDivida } from '../../src/shared/acl/divida/divida-gateway.js';
import type { ResultadoProveniente } from '../../src/shared/acl/receita/receita-gateway.js';

function divida(estado: ResultadoDivida['estado'] | 'indisponivel'): DividaGateway {
  return {
    async consultar(): Promise<ResultadoProveniente<ResultadoDivida>> {
      if (estado === 'indisponivel') return { valor: null, fonte: 'Receita', timestamp: 't', frescor: 'indisponivel' };
      return { valor: { estado }, fonte: 'Receita', timestamp: 't', frescor: 'verificado' };
    },
  };
}
const actor = { userId: 'cpl1' };

describe('VerificarElegibilidade (US2) — bloqueio transitório', () => {
  let blo: BloqueioRepositoryMemory;
  beforeEach(() => { blo = new BloqueioRepositoryMemory(); });

  it('sem débito → pode avançar', async () => {
    const uc = new VerificarElegibilidade(divida('sem_debito'), blo, new InMemoryEventBus());
    expect((await uc.verificar('f1', 'cnpj', 'credenciamento', actor)).podeAvancar).toBe(true);
  });

  it('débito ativo → bloqueia (não avança)', async () => {
    const uc = new VerificarElegibilidade(divida('debito_ativo'), blo, new InMemoryEventBus());
    const r = await uc.verificar('f1', 'cnpj', 'credenciamento', actor);
    expect(r.podeAvancar).toBe(false);
    expect(r.bloqueioId).toBeDefined();
  });

  it('indisponível → fail-open + flag (default)', async () => {
    const uc = new VerificarElegibilidade(divida('indisponivel'), blo, new InMemoryEventBus());
    const r = await uc.verificar('f1', 'cnpj', 'credenciamento', actor);
    expect(r.podeAvancar).toBe(true);
    expect(r.flagCpl).toBe(true);
  });

  it('reavaliação após quitar libera (transitório)', async () => {
    const comDivida = new VerificarElegibilidade(divida('debito_ativo'), blo, new InMemoryEventBus());
    await comDivida.verificar('f1', 'cnpj', 'credenciamento', actor);
    const semDivida = new VerificarElegibilidade(divida('sem_debito'), blo, new InMemoryEventBus());
    const r = await semDivida.verificar('f1', 'cnpj', 'distribuicao', actor);
    expect(r.podeAvancar).toBe(true);
    expect((await blo.ativosDe('f1')).length).toBe(0);
  });

  it('bloqueio persistido sobrevive ao round-trip de estado e continua ativo (durabilidade — migração 0009)', async () => {
    const uc = new VerificarElegibilidade(divida('debito_ativo'), blo, new InMemoryEventBus());
    const r = await uc.verificar('f1', 'cnpj', 'credenciamento', actor);
    const salvo = await blo.porId(r.bloqueioId!);
    // Simula a ida-e-volta ao Postgres (BloqueioRepositoryPg grava/lê exatamente este snapshot).
    const recarregado = Bloqueio.deEstado(salvo!.estado());
    expect(recarregado.situacao).toBe('ativo');
    expect(recarregado.estaAtivo(new Date().toISOString())).toBe(true); // ainda bloqueia numa porta seguinte
  });
});
