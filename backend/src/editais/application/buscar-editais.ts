import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from './listar-editais-compativeis.js';

/** Consulta de editais por instância parcial (QBE — FR-011 / Constituição §IV). */
export class BuscarEditais {
  constructor(private readonly repo: EditalRepository) {}

  async buscar(probe: EditalProbe, page?: PaginacaoReq): Promise<Array<{ id: string; objeto: string; secretariaId: string; situacao: string; cnaesAlvo: readonly string[] }>> {
    const editais = await this.repo.buscarPorExemplo(probe, page);
    return editais.map((e: Edital) => ({ id: e.id, objeto: e.objeto, secretariaId: e.secretariaId, situacao: e.situacao, cnaesAlvo: e.cnaesAlvo }));
  }
}
