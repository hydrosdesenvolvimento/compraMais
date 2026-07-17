import { describe, it, expect } from 'vitest';
import { Edital, EditalSemSecretaria, EditalIncompleto, TransicaoInvalida } from '../../src/editais/domain/edital.js';
import { NumeroEditalInvalido } from '../../src/editais/domain/numero-edital.js';

function rascunho(over: Partial<{ cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string | null }> = {}) {
  return Edital.criar({ id: 'e1', numero: 'ED-2026/001', secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2099-12-31', ...over });
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

  it('publicar exige completude (FR-004)', () => {
    expect(() => rascunho({ quantitativos: 0 }).publicar()).toThrow(EditalIncompleto);
    expect(() => rascunho({ prazoVigencia: null }).publicar()).toThrow(EditalIncompleto);
    expect(() => rascunho({ cnaesAlvo: [] }).publicar()).toThrow(EditalIncompleto);
  });

  it('percorre o caminho feliz do AD-37 (rascunho→aberto→em_analise→em_distribuicao→homologado→em_execucao)', () => {
    const e = rascunho();
    e.publicar('g'); expect(e.situacao).toBe('aberto'); expect(e.naVitrine).toBe(true);
    e.iniciarAnalise('g'); expect(e.situacao).toBe('em_analise');
    e.iniciarDistribuicao('g'); expect(e.situacao).toBe('em_distribuicao'); expect(e.podeDistribuir).toBe(true);
    e.homologar('g'); expect(e.situacao).toBe('homologado'); expect(e.congelado).toBe(true);
    e.iniciarExecucao('g'); expect(e.situacao).toBe('em_execucao'); expect(e.congelado).toBe(true);
  });

  it('só `aberto` entra na vitrine e só `em_distribuicao` distribui (guardas AD-37)', () => {
    const e = rascunho();
    expect(e.naVitrine).toBe(false); expect(e.podeDistribuir).toBe(false);
    e.publicar('g'); expect(e.naVitrine).toBe(true); expect(e.podeDistribuir).toBe(false);
    e.iniciarAnalise('g'); expect(e.naVitrine).toBe(false);
    e.iniciarDistribuicao('g'); expect(e.podeDistribuir).toBe(true);
  });

  it('transições fora de ordem são barradas (TransicaoInvalida)', () => {
    expect(() => rascunho().iniciarAnalise()).toThrow(TransicaoInvalida); // pula publicar
    const e = rascunho(); e.publicar('g');
    expect(() => e.iniciarDistribuicao()).toThrow(TransicaoInvalida); // pula analise
    expect(() => e.homologar()).toThrow(TransicaoInvalida);
    expect(() => e.iniciarExecucao()).toThrow(TransicaoInvalida);
  });

  it('encerrar é terminal ortogonal: alcançável dos estados ativos, não de rascunho, e não re-encerra', () => {
    expect(() => rascunho().encerrar()).toThrow(TransicaoInvalida); // rascunho abandonado é exclusão lógica (AD-38), não encerramento
    const e = rascunho(); e.publicar('g');
    e.iniciarAnalise('g'); e.iniciarDistribuicao('g');
    e.encerrar('gestor1'); expect(e.situacao).toBe('encerrado'); // encerra em plena distribuição
    expect(() => e.encerrar()).toThrow(TransicaoInvalida);
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

  it('estado()/deEstado() faz round-trip fiel (persistência durável — AD-33)', () => {
    const e = rascunho(); e.publicar('gestor1');
    const clone = Edital.deEstado(e.estado());
    expect(clone.estado()).toEqual(e.estado());
    expect(clone.id).toBe(e.id);
    expect(clone.situacao).toBe('aberto');
    expect([...clone.cnaesAlvo]).toEqual([...e.cnaesAlvo]);
    expect(clone.lastUserUpdate).toBe('gestor1');
    // deEstado reconstrói fora das regras de criação (aceita já-aberto, sem revalidar completude)
    clone.encerrar('gestor2');
    expect(clone.situacao).toBe('encerrado');
  });
});
