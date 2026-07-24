import type { ReferenciaBiometrica } from '../domain/biometria.js';
import type { BiometriaRepository } from '../application/biometria-repository.js';

/** Repositório em memória (dev/testes sem banco). Copia o vetor na entrada e na saída para isolar o estado. */
export class BiometriaRepositoryMemory implements BiometriaRepository {
  private readonly refs = new Map<string, ReferenciaBiometrica>();

  async salvarReferencia(ref: ReferenciaBiometrica): Promise<void> {
    this.refs.set(ref.fornecedorId, this.clonar(ref));
  }

  async referenciaPorFornecedor(fornecedorId: string): Promise<ReferenciaBiometrica | null> {
    const r = this.refs.get(fornecedorId);
    return r ? this.clonar(r) : null;
  }

  private clonar(ref: ReferenciaBiometrica): ReferenciaBiometrica {
    return { ...ref, template: { ...ref.template, vetor: [...ref.template.vetor] } };
  }
}
