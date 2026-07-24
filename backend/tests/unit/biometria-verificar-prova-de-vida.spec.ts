import { describe, it, expect, beforeEach } from 'vitest';
import { VerificarProvaDeVida, SemReferenciaBiometrica } from '../../src/biometria/application/verificar-prova-de-vida.js';
import { RegistrarBiometriaReferencia } from '../../src/biometria/application/registrar-referencia.js';
import { BiometriaRepositoryMemory } from '../../src/biometria/adapters/biometria-repository-memory.js';
import { FalhaCapturaFacial, ModeloBiometricoIncompativel } from '../../src/biometria/domain/biometria.js';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';

const IMG_TITULAR = Buffer.from('rosto-do-titular');

describe('VerificarProvaDeVida (passo do wizard, UC007)', () => {
  let repo: BiometriaRepositoryMemory;
  let facial: ReconhecimentoFacialMockGateway;

  beforeEach(async () => {
    repo = new BiometriaRepositoryMemory();
    facial = new ReconhecimentoFacialMockGateway();
    await new RegistrarBiometriaReferencia(repo, facial).registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: IMG_TITULAR });
  });

  it('mesma pessoa (mesma captura) → aprovada, score ≈ 1', async () => {
    const uc = new VerificarProvaDeVida(repo, facial);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('rosto-do-titular') });
    expect(r.status).toBe('aprovada');
    expect(r.score).toBeCloseTo(1, 6);
    expect(r.modelo).toBe('mock-arcface');
  });

  it('pessoa diferente → reprovada', async () => {
    const uc = new VerificarProvaDeVida(repo, facial);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('outra-pessoa-totalmente-diferente') });
    expect(r.status).toBe('reprovada');
    expect(r.score).toBeLessThan(0.35);
  });

  it('sem referência cadastrada → SemReferenciaBiometrica', async () => {
    const uc = new VerificarProvaDeVida(repo, facial);
    await expect(uc.verificar({ fornecedorId: 'sem-ref', imagem: IMG_TITULAR })).rejects.toBeInstanceOf(SemReferenciaBiometrica);
  });

  it('falha de captura ao vivo → FalhaCapturaFacial (não é "reprovada")', async () => {
    const uc = new VerificarProvaDeVida(repo, facial);
    await expect(uc.verificar({ fornecedorId: 'f1', imagem: Buffer.from('FACE:NONE...') })).rejects.toBeInstanceOf(FalhaCapturaFacial);
  });

  it('limiar sobreponível: limiar impossível (1.01) reprova até a mesma captura', async () => {
    const uc = new VerificarProvaDeVida(repo, facial);
    const r = await uc.verificar({ fornecedorId: 'f1', imagem: IMG_TITULAR, limiar: 1.01 });
    expect(r.status).toBe('reprovada');
  });

  it('referência e captura de modelos diferentes → ModeloBiometricoIncompativel', async () => {
    const outroModelo = new ReconhecimentoFacialMockGateway({ modelo: 'outro-modelo' });
    const uc = new VerificarProvaDeVida(repo, outroModelo);
    await expect(uc.verificar({ fornecedorId: 'f1', imagem: IMG_TITULAR })).rejects.toBeInstanceOf(ModeloBiometricoIncompativel);
  });
});
