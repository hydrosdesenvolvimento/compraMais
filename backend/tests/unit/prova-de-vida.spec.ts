import { describe, it, expect } from 'vitest';
import { ProvaDeVida, LimiarInvalido } from '../../src/credenciamento/domain/prova-de-vida.js';
import { ValidarProvaDeVida, GateProvaDeVidaRepo } from '../../src/credenciamento/application/validar-prova-de-vida.js';
import { ProvaDeVidaRepositoryMemory } from '../../src/credenciamento/adapters/prova-de-vida-repository-memory.js';
import { ProvaDeVidaPendente } from '../../src/credenciamento/application/solicitar-credenciamento.js';
import { LivenessMockGateway } from '../../src/shared/acl/liveness/liveness-mock.js';
import type { LivenessGateway, ProvenienteLiveness } from '../../src/shared/acl/liveness/liveness-gateway.js';
import type { EventBus } from '../../src/shared/events/event-bus.js';

const base = { id: 'p1', credenciamentoId: 'c1', fornecedorId: 'f1', provedor: 'mock' };
const busSpy = () => {
  const publicados: string[] = [];
  const bus = { publish: async (e: { eventName: string }) => { publicados.push(e.eventName); } } as unknown as EventBus;
  return { bus, publicados };
};

describe('ProvaDeVida (domínio — UC007/RF012)', () => {
  it('aprova quando score ≥ limiar', () => {
    const p = ProvaDeVida.avaliar({ ...base, veredicto: { disponivel: true, score: 0.9 }, limiar: 0.8 });
    expect(p.situacao).toBe('aprovada');
    expect(p.liberado).toBe(true);
    expect(p.flagCpl).toBe(false);
    expect(p.score).toBe(0.9);
  });

  it('reprova quando score < limiar (A1) — não libera o Termo', () => {
    const p = ProvaDeVida.avaliar({ ...base, veredicto: { disponivel: true, score: 0.5 }, limiar: 0.8 });
    expect(p.situacao).toBe('reprovada');
    expect(p.liberado).toBe(false);
    expect(p.flagCpl).toBe(false);
  });

  it('indisponibilidade → indisponivel + flag CPL, mas libera (fail-open + flag, AD-12)', () => {
    const p = ProvaDeVida.avaliar({ ...base, veredicto: { disponivel: false, score: null }, limiar: 0.8 });
    expect(p.situacao).toBe('indisponivel');
    expect(p.flagCpl).toBe(true);
    expect(p.liberado).toBe(true);
    expect(p.score).toBeNull();
  });

  it('rejeita limiar fora de [0,1]', () => {
    expect(() => ProvaDeVida.avaliar({ ...base, veredicto: { disponivel: true, score: 1 }, limiar: 1.5 })).toThrow(LimiarInvalido);
  });

  it('round-trip de persistência via estado()/deEstado()', () => {
    const p = ProvaDeVida.avaliar({ ...base, veredicto: { disponivel: true, score: 0.85 }, limiar: 0.8, agoraIso: '2026-07-09T10:00:00Z' });
    const restaurado = ProvaDeVida.deEstado(p.estado());
    expect(restaurado.estado()).toEqual(p.estado());
    expect(restaurado.liberado).toBe(true);
  });
});

describe('ValidarProvaDeVida (caso de uso — UC007)', () => {
  const actor = { userId: 'u1', empresaId: 'f1' };

  it('valida via provedor mock (aprovar) → aprovada + evento na trilha', async () => {
    const { bus, publicados } = busSpy();
    const repo = new ProvaDeVidaRepositoryMemory();
    const uc = new ValidarProvaDeVida(new LivenessMockGateway(), repo, bus, 0.8);
    const r = await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'aprovar' }, actor);
    expect(r.estado).toBe('aprovada');
    expect(r.liberado).toBe(true);
    expect(publicados).toContain('ProvaDeVidaAvaliada');
    expect(await uc.consultar('c1')).toMatchObject({ estado: 'aprovada', liberado: true });
  });

  it('reprovar → reprovada e não liberado', async () => {
    const { bus } = busSpy();
    const uc = new ValidarProvaDeVida(new LivenessMockGateway(), new ProvaDeVidaRepositoryMemory(), bus, 0.8);
    const r = await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'reprovar' }, actor);
    expect(r.estado).toBe('reprovada');
    expect(r.liberado).toBe(false);
  });

  it('provedor indisponível → indisponivel + flag CPL (fail-open + flag)', async () => {
    // Gateway que sempre responde indisponível (sem depender do estado do circuit breaker do mock).
    const indisponivel: LivenessGateway = {
      async verificar(): Promise<ProvenienteLiveness> {
        return { valor: null, provedor: 'mock', timestamp: '2026-07-09T10:00:00Z', frescor: 'indisponivel' };
      },
    };
    const { bus } = busSpy();
    const uc = new ValidarProvaDeVida(indisponivel, new ProvaDeVidaRepositoryMemory(), bus, 0.8);
    const r = await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'x' }, actor);
    expect(r.estado).toBe('indisponivel');
    expect(r.flagCpl).toBe(true);
    expect(r.liberado).toBe(true);
  });

  it('consultar sem prova retorna null', async () => {
    const { bus } = busSpy();
    const uc = new ValidarProvaDeVida(new LivenessMockGateway(), new ProvaDeVidaRepositoryMemory(), bus, 0.8);
    expect(await uc.consultar('inexistente')).toBeNull();
  });
});

describe('GateProvaDeVidaRepo (gate do Termo — UC007)', () => {
  it('bloqueia o Termo quando não há prova liberada', async () => {
    const repo = new ProvaDeVidaRepositoryMemory();
    const gate = new GateProvaDeVidaRepo(repo);
    await expect(gate.exigirLiberacao('c1')).rejects.toThrow(ProvaDeVidaPendente);
  });

  it('libera o Termo após uma prova aprovada', async () => {
    const { bus } = busSpy();
    const repo = new ProvaDeVidaRepositoryMemory();
    const uc = new ValidarProvaDeVida(new LivenessMockGateway(), repo, bus, 0.8);
    await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'aprovar' }, { userId: 'u1', empresaId: 'f1' });
    const gate = new GateProvaDeVidaRepo(repo);
    await expect(gate.exigirLiberacao('c1')).resolves.toBeUndefined();
  });

  it('reprovada NÃO libera; indisponível (com flag) libera', async () => {
    const { bus } = busSpy();
    const repo = new ProvaDeVidaRepositoryMemory();
    const uc = new ValidarProvaDeVida(new LivenessMockGateway(), repo, bus, 0.8);
    const gate = new GateProvaDeVidaRepo(repo);

    await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'reprovar' }, { userId: 'u1', empresaId: 'f1' });
    await expect(gate.exigirLiberacao('c1')).rejects.toThrow(ProvaDeVidaPendente);

    await uc.validar('c1', 'f1', { fornecedorId: 'f1', desafio: 'indisponivel' }, { userId: 'u1', empresaId: 'f1' });
    await expect(gate.exigirLiberacao('c1')).resolves.toBeUndefined();
  });
});
