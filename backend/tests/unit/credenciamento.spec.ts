import { describe, it, expect } from 'vitest';
import {
  Credenciamento,
  CapacidadeInvalida,
  TermoIncompleto,
  TransicaoCredenciamentoInvalida,
  CredenciamentoJaDistribuido,
} from '../../src/credenciamento/domain/credenciamento.js';

const base = { id: 'c1', fornecedorId: 'f1', editalId: 'e1', capacidadeTeto: 500 };

describe('Credenciamento (domínio — UC004)', () => {
  it('inicia com capacidade positiva e estado "iniciado" (RN005)', () => {
    const c = Credenciamento.iniciar(base);
    expect(c.situacao).toBe('iniciado');
    expect(c.capacidadeTeto).toBe(500);
    expect(c.termo).toBeNull();
  });

  it('rejeita capacidade não positiva ou não inteira (RN005)', () => {
    expect(() => Credenciamento.iniciar({ ...base, capacidadeTeto: 0 })).toThrow(CapacidadeInvalida);
    expect(() => Credenciamento.iniciar({ ...base, capacidadeTeto: -3 })).toThrow(CapacidadeInvalida);
    expect(() => Credenciamento.iniciar({ ...base, capacidadeTeto: 1.5 })).toThrow(CapacidadeInvalida);
  });

  it('aceita o Termo de Aceite gravando finalidade + versão + timestamp (RN016)', () => {
    const c = Credenciamento.iniciar(base);
    c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' }, 'f1', '2026-07-07T12:00:00Z');
    expect(c.situacao).toBe('aceito');
    expect(c.termo).toEqual({ versao: 'v1', finalidade: 'credenciamento', aceitoEm: '2026-07-07T12:00:00Z' });
    expect(c.updateDate).toBe('2026-07-07T12:00:00Z');
  });

  it('exige versão e finalidade não vazias no Termo de Aceite', () => {
    const c = Credenciamento.iniciar(base);
    expect(() => c.aceitarTermo({ versao: '', finalidade: 'credenciamento' })).toThrow(TermoIncompleto);
    expect(() => c.aceitarTermo({ versao: 'v1', finalidade: '  ' })).toThrow(TermoIncompleto);
    expect(c.situacao).toBe('iniciado');
  });

  it('não aceita termo fora do estado "iniciado"', () => {
    const c = Credenciamento.iniciar(base);
    c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    expect(() => c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' })).toThrow(TransicaoCredenciamentoInvalida);
  });

  it('cancela antes da distribuição a partir de "iniciado" e de "aceito" (A2)', () => {
    const iniciado = Credenciamento.iniciar(base);
    iniciado.cancelar('f1');
    expect(iniciado.situacao).toBe('cancelado');

    const aceito = Credenciamento.iniciar(base);
    aceito.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    aceito.cancelar('f1');
    expect(aceito.situacao).toBe('cancelado');
  });

  it('bloqueia cancelamento após a distribuição — saída por substituição (RN004)', () => {
    const c = Credenciamento.deEstado({ ...Credenciamento.iniciar(base).estado(), estado: 'aceito', distribuidoEm: '2026-07-07T00:00:00Z' });
    expect(() => c.cancelar('f1')).toThrow(CredenciamentoJaDistribuido);
  });

  it('bloqueia cancelamento duplicado', () => {
    const c = Credenciamento.iniciar(base);
    c.cancelar('f1');
    expect(() => c.cancelar('f1')).toThrow(TransicaoCredenciamentoInvalida);
  });

  it('faz round-trip de persistência via estado()/deEstado()', () => {
    const c = Credenciamento.iniciar(base);
    c.aceitarTermo({ versao: 'v2', finalidade: 'credenciamento' }, 'f1', '2026-07-07T12:00:00Z');
    const restaurado = Credenciamento.deEstado(c.estado());
    expect(restaurado.estado()).toEqual(c.estado());
    expect(restaurado.termo?.versao).toBe('v2');
  });
});
