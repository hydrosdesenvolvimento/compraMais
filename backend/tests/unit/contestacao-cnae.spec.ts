import { describe, it, expect } from 'vitest';
import { ContestacaoCnae, JustificativaContestacaoObrigatoria, MotivoRecusaObrigatorio } from '../../src/editais/domain/contestacao-cnae.js';

function aberta() {
  return ContestacaoCnae.abrir({ id: 'c1', editalId: 'e1', fornecedorId: 'f1', cnaeContestado: '1091101', justificativa: 'meu CNAE é compatível' });
}

describe('ContestacaoCnae (US2)', () => {
  it('abertura exige justificativa (FR-007)', () => {
    expect(() => ContestacaoCnae.abrir({ id: 'c', editalId: 'e', fornecedorId: 'f', cnaeContestado: 'x', justificativa: '  ' })).toThrow(JustificativaContestacaoObrigatoria);
  });

  it('nasce pendente; acatar muda situação', () => {
    const c = aberta(); expect(c.situacao).toBe('pendente');
    c.acatar('cpl1'); expect(c.situacao).toBe('acatada'); expect(c.resolvidaPor).toBe('cpl1');
  });

  it('recusar exige motivo (FR-009)', () => {
    const c = aberta();
    expect(() => c.recusar('', 'cpl1')).toThrow(MotivoRecusaObrigatorio);
    c.recusar('CNAE realmente incompatível', 'cpl1');
    expect(c.situacao).toBe('recusada'); expect(c.motivoResolucao).toMatch(/incompatível/);
  });

  it('não resolve duas vezes', () => {
    const c = aberta(); c.acatar('cpl1');
    expect(() => c.recusar('x', 'cpl1')).toThrow();
  });

  it('round-trip estado()/deEstado() preserva o agregado (durabilidade UC016/AD-33)', () => {
    const c = aberta();
    c.recusar('CNAE realmente incompatível', 'cpl1');
    const reconstruida = ContestacaoCnae.deEstado(c.estado());
    expect(reconstruida.estado()).toEqual(c.estado());
    expect(reconstruida.situacao).toBe('recusada');
    expect(reconstruida.motivoResolucao).toMatch(/incompatível/);
    expect(reconstruida.resolvidaPor).toBe('cpl1');
    expect(reconstruida.id).toBe(c.id);
  });
});
