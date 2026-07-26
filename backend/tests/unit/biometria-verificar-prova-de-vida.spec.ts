import { describe, it, expect, beforeEach } from 'vitest';
import { VerificarProvaDeVida, SemReferenciaBiometrica, type ReferenciaAprovacao } from '../../src/biometria/application/verificar-prova-de-vida.js';
import { BiometriaRepositoryMemory } from '../../src/biometria/adapters/biometria-repository-memory.js';
import { FalhaCapturaFacial, ModeloBiometricoIncompativel, ReferenciaBiometricaNaoAprovada, type ReferenciaBiometrica } from '../../src/biometria/domain/biometria.js';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';

const IMG_TITULAR = Buffer.from('rosto-do-titular');
const aprovaSempre: ReferenciaAprovacao = { aprovada: async () => true };
const nuncaAprova: ReferenciaAprovacao = { aprovada: async () => false };

describe('VerificarProvaDeVida (passo do wizard, UC007)', () => {
  let repo: BiometriaRepositoryMemory;
  let facial: ReconhecimentoFacialMockGateway;

  beforeEach(async () => {
    repo = new BiometriaRepositoryMemory();
    facial = new ReconhecimentoFacialMockGateway();
    // Semeia a referência a partir do template determinístico da MESMA foto (evita depender do enrollment).
    const ext = await facial.extrairTemplate(IMG_TITULAR);
    if (!ext.ok) throw new Error('mock deveria extrair');
    const ref: ReferenciaBiometrica = { fornecedorId: 'f1', usuarioId: 'u1', documentoId: 'doc1', template: ext.template, criadoEm: 'x', atualizadoEm: 'x' };
    await repo.salvarReferencia(ref);
  });

  it('referência aprovada + mesma pessoa → aprovada, score ≈ 1', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, aprovaSempre);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('rosto-do-titular') });
    expect(r.status).toBe('aprovada');
    expect(r.score).toBeCloseTo(1, 6);
  });

  it('pessoa diferente → reprovada', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, aprovaSempre);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('outra-pessoa-totalmente-diferente') });
    expect(r.status).toBe('reprovada');
  });

  it('referência ainda NÃO aprovada pela CPL → ReferenciaBiometricaNaoAprovada', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, nuncaAprova);
    await expect(uc.verificar({ fornecedorId: 'f1', imagem: IMG_TITULAR })).rejects.toBeInstanceOf(ReferenciaBiometricaNaoAprovada);
  });

  it('sem referência cadastrada → SemReferenciaBiometrica', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, aprovaSempre);
    await expect(uc.verificar({ fornecedorId: 'sem-ref', imagem: IMG_TITULAR })).rejects.toBeInstanceOf(SemReferenciaBiometrica);
  });

  it('falha de captura ao vivo → FalhaCapturaFacial (não é "reprovada")', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, aprovaSempre);
    await expect(uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('FACE:NONE...') })).rejects.toBeInstanceOf(FalhaCapturaFacial);
  });

  it('limiar sobreponível: limiar impossível (1.01) reprova até a mesma captura', async () => {
    const uc = new VerificarProvaDeVida(repo, facial, aprovaSempre);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: IMG_TITULAR, limiar: 1.01 });
    expect(r.status).toBe('reprovada');
  });

  it('referência e captura de modelos diferentes → ModeloBiometricoIncompativel', async () => {
    const outroModelo = new ReconhecimentoFacialMockGateway({ modelo: 'outro-modelo' });
    const uc = new VerificarProvaDeVida(repo, outroModelo, aprovaSempre);
    await expect(uc.verificar({ fornecedorId: 'f1', imagem: IMG_TITULAR })).rejects.toBeInstanceOf(ModeloBiometricoIncompativel);
  });
});
