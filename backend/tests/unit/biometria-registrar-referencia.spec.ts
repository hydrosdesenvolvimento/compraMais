import { describe, it, expect, beforeEach } from 'vitest';
import { RegistrarBiometriaReferencia } from '../../src/biometria/application/registrar-referencia.js';
import { BiometriaRepositoryMemory } from '../../src/biometria/adapters/biometria-repository-memory.js';
import { FalhaCapturaFacial } from '../../src/biometria/domain/biometria.js';
import { ReconhecimentoFacialMockGateway } from '../../src/shared/acl/facial/reconhecimento-facial-mock.js';

describe('RegistrarBiometriaReferencia (captura no cadastro, UC007)', () => {
  let repo: BiometriaRepositoryMemory;
  let facial: ReconhecimentoFacialMockGateway;

  beforeEach(() => {
    repo = new BiometriaRepositoryMemory();
    facial = new ReconhecimentoFacialMockGateway();
  });

  it('extrai o template da foto e persiste a referência vinculada ao fornecedor', async () => {
    const uc = new RegistrarBiometriaReferencia(repo, facial);
    const r = await uc.registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: Buffer.from('rosto-titular') });

    expect(r.dim).toBe(512);
    expect(r.modelo).toBe('mock-arcface');
    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.usuarioId).toBe('u1');
    expect(ref?.template.vetor).toHaveLength(512);
  });

  it('falha de captura (múltiplos rostos) sobe como FalhaCapturaFacial e NÃO persiste', async () => {
    const uc = new RegistrarBiometriaReferencia(repo, facial);
    await expect(uc.registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: Buffer.from('FACE:MULTI...') }))
      .rejects.toBeInstanceOf(FalhaCapturaFacial);
    expect(await repo.referenciaPorFornecedor('f1')).toBeNull();
  });

  it('propaga o motivo tipado da falha (para o controller mapear o codigo)', async () => {
    const uc = new RegistrarBiometriaReferencia(repo, facial);
    await expect(uc.registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: Buffer.alloc(0) }))
      .rejects.toMatchObject({ motivo: 'rosto_nao_detectado' });
  });

  it('re-cadastro preserva criadoEm e atualiza atualizadoEm', async () => {
    let t = '2026-01-01T00:00:00.000Z';
    const uc = new RegistrarBiometriaReferencia(repo, facial, () => t);
    await uc.registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: Buffer.from('foto-antiga') });

    t = '2026-06-01T00:00:00.000Z';
    await uc.registrar({ fornecedorId: 'f1', usuarioId: 'u1', imagem: Buffer.from('foto-nova') });

    const ref = await repo.referenciaPorFornecedor('f1');
    expect(ref?.criadoEm).toBe('2026-01-01T00:00:00.000Z');
    expect(ref?.atualizadoEm).toBe('2026-06-01T00:00:00.000Z');
  });
});
