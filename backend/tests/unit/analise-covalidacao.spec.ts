import { describe, it, expect } from 'vitest';
import { AnaliseCovalidacao, JustificativaObrigatoriaAnalise } from '../../src/credenciamento/domain/analise-covalidacao.js';

describe('AnaliseCovalidacao (domínio)', () => {
  it('aprova sem justificativa', () => {
    const a = AnaliseCovalidacao.aprovar({ id: 'a1', documentoId: 'd1', analistaId: 'cpl1' });
    expect(a.resultado).toBe('aprovado');
    expect(a.justificativa).toBeNull();
  });

  it('reprova exige justificativa (FR-002/RN003)', () => {
    expect(() => AnaliseCovalidacao.reprovar({ id: 'a2', documentoId: 'd1', analistaId: 'cpl1', justificativa: '  ' }))
      .toThrow(JustificativaObrigatoriaAnalise);
  });

  it('reprova com justificativa registra o motivo', () => {
    const a = AnaliseCovalidacao.reprovar({ id: 'a3', documentoId: 'd1', analistaId: 'cpl1', justificativa: 'Imagem ilegível' });
    expect(a.resultado).toBe('reprovado');
    expect(a.justificativa).toBe('Imagem ilegível');
  });

  it('estende EntidadeBase (id/registerDate/lastUserUpdate)', () => {
    const a = AnaliseCovalidacao.aprovar({ id: 'a4', documentoId: 'd1', analistaId: 'cpl1' });
    expect(a.id).toBe('a4');
    expect(a.lastUserUpdate).toBe('cpl1');
    expect(typeof a.registerDate).toBe('string');
  });
});
