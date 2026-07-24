import { describe, it, expect } from 'vitest';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';
import { compararCosseno, corresponde } from '../../src/shared/acl/facial/comparar-cosseno.js';

const gw = new ReconhecimentoFacialMockGateway();

async function extrair(b: Buffer) {
  const r = await gw.extrairTemplate(b);
  if (!r.ok) throw new Error(`extração falhou: ${r.motivo}`);
  return r.template;
}

describe('ReconhecimentoFacialMockGateway (determinístico, offline — DEC-STR-34)', () => {
  it('a mesma imagem gera o mesmo template → corresponde a si mesma', async () => {
    const img = Buffer.from('foto-do-responsavel-A');
    const t1 = await extrair(img);
    const t2 = await extrair(Buffer.from('foto-do-responsavel-A'));
    expect(compararCosseno(t1.vetor, t2.vetor)).toBeCloseTo(1, 6);
    expect(corresponde(t1.vetor, t2.vetor)).toBe(true);
  });

  it('imagens diferentes geram templates diferentes → NÃO correspondem', async () => {
    const t1 = await extrair(Buffer.from('rosto-da-pessoa-A'));
    const t2 = await extrair(Buffer.from('rosto-da-pessoa-B-completamente-outra'));
    expect(compararCosseno(t1.vetor, t2.vetor)).toBeLessThan(1);
    expect(corresponde(t1.vetor, t2.vetor)).toBe(false);
  });

  it('template é L2-normalizado (norma ≈ 1) e tem a dimensão configurada', async () => {
    const t = await extrair(Buffer.from('qualquer'));
    const norma = Math.sqrt(t.vetor.reduce((s, v) => s + v * v, 0));
    expect(norma).toBeCloseTo(1, 6);
    expect(t.vetor).toHaveLength(t.dim);
    expect(t.dim).toBe(512);
    expect(t.modelo).toBeTruthy();
  });

  it('buffer vazio → falha tipada rosto_nao_detectado', async () => {
    const r = await gw.extrairTemplate(Buffer.alloc(0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('rosto_nao_detectado');
  });

  it('sentinela FACE:MULTI → multiplos_rostos (para exercitar o ramo do controller)', async () => {
    const r = await gw.extrairTemplate(Buffer.from('FACE:MULTI...'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('multiplos_rostos');
  });

  it('sentinela FACE:BLUR → qualidade_baixa', async () => {
    const r = await gw.extrairTemplate(Buffer.from('FACE:BLUR...'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('qualidade_baixa');
  });

  it('dim e modelo são configuráveis', async () => {
    const g = new ReconhecimentoFacialMockGateway({ dim: 8, modelo: 'mock-teste' });
    const r = await g.extrairTemplate(Buffer.from('x'));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.template.dim).toBe(8);
      expect(r.template.modelo).toBe('mock-teste');
    }
  });
});
