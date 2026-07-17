import { describe, it, expect } from 'vitest';
import { Documento } from '../../src/credenciamento/domain/documento.js';

/**
 * Round-trip estado()/deEstado() (AD-33). É a precondição que faltava para o Documento ganhar
 * adaptador Postgres: sem snapshot tipado não havia o que gravar/reidratar. O que estes testes
 * protegem é a fidelidade do par — em especial os campos PRIVADOS (`_status`/`_motivoReprovacao`),
 * que não aparecem no construtor público `enviar` e sumiriam num snapshot desatento.
 */
describe('Documento — snapshot estado/deEstado (AD-33)', () => {
  const base = {
    id: 'd1', fornecedorId: 'f1', tipo: 'balanco',
    arquivoRef: 'pg://f1/d1', formato: 'pdf' as const, dataValidade: '2027-01-01', userName: 'fornecedor@x',
  };

  it('documento recém-enviado sobrevive ao round-trip com todos os campos', () => {
    const d = Documento.enviar(base);
    const r = Documento.deEstado(d.estado());

    expect(r.estado()).toEqual(d.estado());
    expect(r.id).toBe('d1');
    expect(r.fornecedorId).toBe('f1');
    expect(r.tipo).toBe('balanco');
    expect(r.arquivoRef).toBe('pg://f1/d1');
    expect(r.formato).toBe('pdf');
    expect(r.dataValidade).toBe('2027-01-01');
    expect(r.status).toBe('pendente');
    expect(r.motivoReprovacao).toBeNull();
  });

  it('preserva os metadados de auditoria de linha (não os regenera)', () => {
    const d = Documento.enviar(base);
    const r = Documento.deEstado(d.estado());
    expect(r.registerDate).toBe(d.registerDate);
    expect(r.updateDate).toBe(d.updateDate);
    expect(r.lastUserUpdate).toBe('fornecedor@x');
  });

  it('deEstado NÃO reinicia o ciclo: documento reprovado volta reprovado, com o motivo', () => {
    const d = Documento.enviar(base);
    d.reprovar('Balanço ilegível', 'analista@cpl');

    const r = Documento.deEstado(d.estado());
    expect(r.status).toBe('reprovado');
    expect(r.motivoReprovacao).toBe('Balanço ilegível');
    expect(r.lastUserUpdate).toBe('analista@cpl');
  });

  it('documento aprovado volta aprovado e sem motivo de reprovação', () => {
    const d = Documento.enviar(base);
    d.aprovar('analista@cpl');

    const r = Documento.deEstado(d.estado());
    expect(r.status).toBe('aprovado');
    expect(r.motivoReprovacao).toBeNull();
  });

  it('o agregado reidratado continua rico: aceita a transição seguinte (reenvio após reprovação)', () => {
    const d = Documento.enviar(base);
    d.reprovar('faltou assinatura', 'analista@cpl');

    const r = Documento.deEstado(d.estado());
    r.reenviar('fornecedor@x'); // só é permitido a partir de 'reprovado' — prova que o status veio junto
    expect(r.status).toBe('pendente');
    expect(r.motivoReprovacao).toBeNull();
  });

  it('reidratado de "aprovado" recusa nova transição (invariante preservada, não só o dado)', () => {
    const d = Documento.enviar(base);
    d.aprovar('analista@cpl');

    const r = Documento.deEstado(d.estado());
    expect(() => r.aprovar('outro@cpl')).toThrow(/not pending/i);
  });

  it('dataValidade nula sobrevive como nula (documento sem validade)', () => {
    const d = Documento.enviar({ ...base, dataValidade: null });
    expect(Documento.deEstado(d.estado()).dataValidade).toBeNull();
  });

  it('estado() é uma cópia: mutar o snapshot não afeta o agregado', () => {
    const d = Documento.enviar(base);
    const s = d.estado();
    s.status = 'aprovado';
    s.meta.id = 'outro';
    expect(d.status).toBe('pendente');
    expect(d.id).toBe('d1');
  });
});
