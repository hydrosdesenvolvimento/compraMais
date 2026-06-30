import { describe, it, expect } from 'vitest';
import { Edital, EditalSemSecretaria, EditalIncompleto, TransicaoInvalida } from '../../src/editais/domain/edital.js';

function rascunho(over: Partial<{ cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string | null }> = {}) {
  return Edital.criar({ id: 'e1', secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2099-12-31', ...over });
}

describe('Edital (US1)', () => {
  it('exige exatamente uma secretaria (RN007/AD-11)', () => {
    expect(() => Edital.criar({ id: 'e', secretariaId: '', objeto: 'x', cnaesAlvo: ['1091101'] })).toThrow(EditalSemSecretaria);
  });

  it('nasce em rascunho', () => {
    expect(rascunho().situacao).toBe('rascunho');
  });

  it('publicar exige completude (FR-004)', () => {
    expect(() => rascunho({ quantitativos: 0 }).publicar()).toThrow(EditalIncompleto);
    expect(() => rascunho({ prazoVigencia: null }).publicar()).toThrow(EditalIncompleto);
    expect(() => rascunho({ cnaesAlvo: [] }).publicar()).toThrow(EditalIncompleto);
  });

  it('ciclo rascunho→publicado→encerrado; transições inválidas barradas', () => {
    const e = rascunho();
    e.publicar('gestor1'); expect(e.situacao).toBe('publicado');
    e.encerrar('gestor1'); expect(e.situacao).toBe('encerrado');
    expect(() => e.publicar()).toThrow(TransicaoInvalida);
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
});
