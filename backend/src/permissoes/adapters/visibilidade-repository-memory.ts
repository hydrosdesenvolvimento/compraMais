import type { VisibilidadePapel, VisibilidadeRepository } from '../application/visibilidade-repository.js';
import type { PapelConfiguravel, TelaAdminKey } from '../domain/tela-admin.js';

/** Adaptador em memória da porta VisibilidadeRepository (testes e MVP sem banco). */
export class VisibilidadeRepositoryMemory implements VisibilidadeRepository {
  private readonly mapa = new Map<PapelConfiguravel, TelaAdminKey[]>();

  async carregar(): Promise<VisibilidadePapel[]> {
    return [...this.mapa.entries()].map(([papel, telasVisiveis]) => ({ papel, telasVisiveis: [...telasVisiveis] }));
  }

  async porPapel(papel: PapelConfiguravel): Promise<VisibilidadePapel | null> {
    const telas = this.mapa.get(papel);
    return telas ? { papel, telasVisiveis: [...telas] } : null;
  }

  async salvar(papel: PapelConfiguravel, telasVisiveis: TelaAdminKey[]): Promise<void> {
    this.mapa.set(papel, [...telasVisiveis]);
  }
}
