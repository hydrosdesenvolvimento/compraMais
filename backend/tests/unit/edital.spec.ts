import { describe, it, expect } from 'vitest';
import { Edital, EditalSemSecretaria, EditalIncompleto, TransicaoInvalida } from '../../src/editais/domain/edital.js';
import { NumeroEditalInvalido } from '../../src/editais/domain/numero-edital.js';

function rascunho(over: Partial<{ cnaesAlvo: string[]; prazoVigencia: string | null }> = {}) {
  return Edital.criar({ id: 'e1', numero: 'ED-2026/001', secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], prazoVigencia: '2099-12-31', ...over });
}

describe('Edital (US1)', () => {
  it('exige exatamente uma secretaria (RN007/AD-11)', () => {
    expect(() => Edital.criar({ id: 'e', numero: 'ED-2026/001', secretariaId: '', objeto: 'x', cnaesAlvo: ['1091101'] })).toThrow(EditalSemSecretaria);
  });

  it('exige numeração oficial válida (ED-AAAA/NNN)', () => {
    expect(() => Edital.criar({ id: 'e', numero: '123', secretariaId: 's1', objeto: 'x', cnaesAlvo: ['1091101'] })).toThrow(NumeroEditalInvalido);
  });

  it('a numeração sobrevive ao round-trip estado/deEstado (AD-33)', () => {
    const e = rascunho();
    expect(Edital.deEstado(e.estado()).numero).toBe('ED-2026/001');
  });

  it('nasce em rascunho', () => {
    expect(rascunho().situacao).toBe('rascunho');
  });

  it('publicar exige completude (FR-004) — objeto, CNAE alvo e prazo (a demanda vive nos itens)', () => {
    expect(() => rascunho({ prazoVigencia: null }).publicar()).toThrow(EditalIncompleto);
    expect(() => rascunho({ cnaesAlvo: [] }).publicar()).toThrow(EditalIncompleto);
    // Sem quantitativo agregado: um edital com objeto+CNAE+prazo publica (a quantidade é dos itens).
    expect(() => rascunho().publicar()).not.toThrow();
  });

  it('ciclo rascunho→publicado→encerrado; transições inválidas barradas', () => {
    const e = rascunho();
    e.publicar('gestor1'); expect(e.situacao).toBe('publicado');
    e.encerrar('gestor1'); expect(e.situacao).toBe('encerrado');
    expect(() => e.publicar()).toThrow(TransicaoInvalida);
  });

  it('despublicar volta publicado → rascunho; fora de publicado é barrado', () => {
    const e = rascunho();
    e.publicar('gestor1');
    e.despublicar('gestor1'); expect(e.situacao).toBe('rascunho');
    expect(() => e.despublicar()).toThrow(TransicaoInvalida); // rascunho → rascunho não é despublicação
    e.publicar('gestor1'); e.encerrar('gestor1');
    expect(() => e.despublicar()).toThrow(TransicaoInvalida); // encerrado não se despublica
  });

  it('editar devolve diff antes/depois (FR-013) e marca ampliação de público (FR-014)', () => {
    const e = rascunho(); e.publicar();
    const r = e.editar({ objeto: 'merenda escolar', cnaesAlvo: ['1091101', '1092900'] }, 'gestor1');
    expect(r.diff.map((d) => d.campo).sort()).toEqual(['cnaesAlvo', 'objeto']);
    expect(r.ampliouPublico).toBe(true); // adicionou um CNAE
  });

  it('editar sem mudança real não gera diff', () => {
    const e = rascunho();
    expect(e.editar({ objeto: 'merenda' }, 'g').diff).toHaveLength(0);
  });

  it('estado()/deEstado() faz round-trip fiel (persistência durável — AD-33)', () => {
    const e = rascunho(); e.publicar('gestor1');
    const clone = Edital.deEstado(e.estado());
    expect(clone.estado()).toEqual(e.estado());
    expect(clone.id).toBe(e.id);
    expect(clone.situacao).toBe('publicado');
    expect([...clone.cnaesAlvo]).toEqual([...e.cnaesAlvo]);
    expect(clone.lastUserUpdate).toBe('gestor1');
    // deEstado reconstrói fora das regras de criação (aceita já-publicado, sem revalidar completude)
    clone.encerrar('gestor2');
    expect(clone.situacao).toBe('encerrado');
  });
});
