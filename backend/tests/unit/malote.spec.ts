import { describe, it, expect } from 'vitest';
import { Malote, type Peca } from '../../src/malote/domain/malote.js';

function malote(limite: number) {
  return Malote.criar({ id: 'm1', fornecedorId: 'f1', editalId: 'e1', limiteBytes: limite });
}
const pecas: Peca[] = [
  { tipo: 'certidao', ref: 'c1', tamanhoBytes: 100 },
  { tipo: 'cnpj', ref: 'cnpj1', tamanhoBytes: 100 },
  { tipo: 'anexo', ref: 'a1', tamanhoBytes: 100 },
  { tipo: 'pessoal', ref: 'p1', tamanhoBytes: 100 },
];

describe('Malote (Épico 6)', () => {
  it('monta na ordem legal CNPJ→Pessoal→Anexos→Certidões (FR-001)', () => {
    const m = malote(1000); m.montar(pecas);
    expect(m.pecas.map((p) => p.tipo)).toEqual(['cnpj', 'pessoal', 'anexo', 'certidao']);
    expect(m.status).toBe('gerado');
  });

  it('fragmenta respeitando o limite, preservando ordem (FR-003)', () => {
    const m = malote(250); m.montar(pecas); // 4×100 com limite 250 → 2 por fragmento
    expect(m.fragmentos).toHaveLength(2);
    expect(m.fragmentos.every((f) => f.tamanhoBytes <= 250)).toBe(true);
    expect(m.fragmentos[0].pecasRefs).toEqual(['cnpj1', 'p1']);
  });

  it('exportação idempotente (FR-004)', () => {
    const m = malote(1000); m.montar(pecas);
    expect(m.marcarExportado().jaExportado).toBe(false);
    expect(m.marcarExportado().jaExportado).toBe(true); // 2ª vez não duplica
    expect(m.status).toBe('exportado');
  });

  it('peça indivisível acima do limite vira fragmento próprio sinalizado (FR-009)', () => {
    const m = malote(150); // limite 150
    m.montar([{ tipo: 'cnpj', ref: 'cnpj1', tamanhoBytes: 100 }, { tipo: 'anexo', ref: 'gigante', tamanhoBytes: 500 }]);
    expect(m.temPecaAcimaLimite).toBe(true);
    const fragGigante = m.fragmentos.find((f) => f.pecasRefs.includes('gigante'));
    expect(fragGigante?.acimaLimite).toBe(true);
    expect(fragGigante?.pecasRefs).toEqual(['gigante']); // isolada, sem split binário
  });

  it('round-trip estado()/deEstado() preserva o agregado (durabilidade, AD-33)', () => {
    const original = malote(250); original.montar(pecas); original.marcarExportado();
    const reconstruido = Malote.deEstado(original.estado());
    expect(reconstruido.id).toBe(original.id);
    expect(reconstruido.status).toBe('exportado');
    expect(reconstruido.fornecedorId).toBe('f1');
    expect(reconstruido.editalId).toBe('e1');
    expect(reconstruido.limiteBytes).toBe(250);
    expect(reconstruido.pecas.map((p) => p.tipo)).toEqual(['cnpj', 'pessoal', 'anexo', 'certidao']);
    expect(reconstruido.fragmentos).toHaveLength(original.fragmentos.length);
    expect(reconstruido.temPecaAcimaLimite).toBe(original.temPecaAcimaLimite);
  });
});
