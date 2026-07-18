import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from './listar-editais-compativeis.js';

/** Consulta de editais por instância parcial (QBE — FR-011 / Constituição §IV). */
export class BuscarEditais {
  constructor(private readonly repo: EditalRepository) {}

  async buscar(probe: EditalProbe, page?: PaginacaoReq): Promise<Array<{ id: string; numero: string; objeto: string; secretariaId: string; situacao: string; cnaesAlvo: readonly string[]; quantitativos: number; prazoVigencia: string | null }>> {
    const editais = await this.repo.buscarPorExemplo(probe, page);
    // `numero`/`quantitativos`/`prazoVigencia` alimentam a tela "Operação · Editais" (Painel Admin). O número
    // oficial (ED-AAAA/NNN) é identificador humano, não montante — RN013 veda valores, não a numeração.
    return editais.map((e: Edital) => ({ id: e.id, numero: e.numero, objeto: e.objeto, secretariaId: e.secretariaId, situacao: e.situacao, cnaesAlvo: e.cnaesAlvo, quantitativos: e.quantitativos, prazoVigencia: e.prazoVigencia }));
  }
}
