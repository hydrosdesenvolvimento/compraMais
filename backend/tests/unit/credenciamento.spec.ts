import { describe, it, expect } from 'vitest';
import {
  Credenciamento,
  CapacidadeInvalida,
  TermoIncompleto,
  TransicaoCredenciamentoInvalida,
  CredenciamentoJaDistribuido,
  PassoInvalido,
  TOTAL_PASSOS_CREDENCIAMENTO,
} from '../../src/credenciamento/domain/credenciamento.js';

const base = { id: 'c1', fornecedorId: 'f1', editalId: 'e1', capacidadeTeto: 500 };

describe('Credenciamento (domínio — UC004)', () => {
  it('inicia com capacidade positiva e estado "iniciado" (RN005)', () => {
    const c = Credenciamento.iniciar(base);
    expect(c.situacao).toBe('iniciado');
    expect(c.capacidadeTeto).toBe(500);
    expect(c.termo).toBeNull();
    expect(c.passoAtual).toBe(1); // Capacidade é o passo de nascimento
  });

  it('registra o passo do wizard enquanto "iniciado" (UC004 — "Etapa n/N")', () => {
    const c = Credenciamento.iniciar(base);
    c.registrarPasso(2, 'f1'); // Documentos
    expect(c.passoAtual).toBe(2);
    c.registrarPasso(3, 'f1'); // Termo
    expect(c.passoAtual).toBe(3);
    c.registrarPasso(2, 'f1'); // o wizard permite voltar
    expect(c.passoAtual).toBe(2);
  });

  it('rejeita passo fora de 1..N-1 (o passo N/Concluído só vem pelo aceite)', () => {
    const c = Credenciamento.iniciar(base);
    expect(() => c.registrarPasso(0)).toThrow(PassoInvalido);
    expect(() => c.registrarPasso(TOTAL_PASSOS_CREDENCIAMENTO)).toThrow(PassoInvalido);
    expect(() => c.registrarPasso(1.5)).toThrow(PassoInvalido);
  });

  it('não registra passo fora de "iniciado" (aceito/cancelado congelam o passo)', () => {
    const aceito = Credenciamento.iniciar(base);
    aceito.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    expect(() => aceito.registrarPasso(2)).toThrow(TransicaoCredenciamentoInvalida);
  });

  it('o aceite do termo leva ao passo final (Concluído = N)', () => {
    const c = Credenciamento.iniciar(base);
    c.registrarPasso(2, 'f1');
    c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' });
    expect(c.passoAtual).toBe(TOTAL_PASSOS_CREDENCIAMENTO);
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
