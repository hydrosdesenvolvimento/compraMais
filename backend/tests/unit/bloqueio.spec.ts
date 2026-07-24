import { describe, it, expect } from 'vitest';
import { Bloqueio } from '../../src/credenciamento/domain/bloqueio.js';

describe('Bloqueio (domínio) — transitório', () => {
  it('débito fica ativo até ser liberado (nunca permanente por data)', () => {
    const b = Bloqueio.aplicar({ id: 'b1', fornecedorId: 'f1', tipo: 'debito', motivo: 'débito ativo' });
    expect(b.estaAtivo('2026-06-30T00:00:00Z')).toBe(true);
    b.liberar('cpl1');
    expect(b.estaAtivo('2026-06-30T00:00:00Z')).toBe(false); // reversível
  });

  it('penalidade vigora até a dataTermino', () => {
    const b = Bloqueio.aplicar({ id: 'b2', fornecedorId: 'f1', tipo: 'penalidade', dataTermino: '2026-07-01T00:00:00Z', motivo: 'penalidade' });
    expect(b.estaAtivo('2026-06-30T00:00:00Z')).toBe(true);
    expect(b.estaAtivo('2026-07-02T00:00:00Z')).toBe(false);
  });

  it('registrar término manual (fallback CPL — D3)', () => {
    const b = Bloqueio.aplicar({ id: 'b3', fornecedorId: 'f1', tipo: 'inidoneidade', motivo: 'inidoneidade' });
    b.registrarTermino('2026-12-31T00:00:00Z', 'cpl1');
    expect(b.origemTermino).toBe('manual');
    expect(b.estaAtivo('2027-01-01T00:00:00Z')).toBe(false);
  });

  it('round-trip estado()/deEstado() preserva o agregado (durabilidade — migração 0009)', () => {
    const b = Bloqueio.aplicar({ id: 'b4', fornecedorId: 'f9', tipo: 'penalidade', dataTermino: '2026-08-01T00:00:00Z', motivo: 'penalidade', userName: 'cpl1' });
    b.liberar('cpl2'); // muta situação + auditoria de linha
    const restaurado = Bloqueio.deEstado(b.estado());
    expect(restaurado.estado()).toEqual(b.estado());
    expect(restaurado.situacao).toBe('liberado');
    expect(restaurado.dataTermino).toBe('2026-08-01T00:00:00Z');
    expect(restaurado.origemTermino).toBe('fonte');
    expect(restaurado.lastUserUpdate).toBe('cpl2');
  });
});
