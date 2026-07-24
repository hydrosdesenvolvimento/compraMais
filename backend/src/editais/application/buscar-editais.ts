import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from './listar-editais-compativeis.js';

/** Read model de um edital na busca de gestão (número/quantitativo/prazo alimentam a tela "Operação · Editais"). */
export interface EditalView { id: string; numero: string; objeto: string; secretariaId: string; situacao: string; cnaesAlvo: readonly string[]; prazoVigencia: string | null }

/** Página de resultados: itens da página corrente + total do filtro (pager) + eco de page/size aplicados. */
export interface PaginaEditais { items: EditalView[]; total: number; page: number; size: number }

const TAMANHO_PADRAO = 20;

/** Consulta de editais por instância parcial (QBE — FR-011 / Constituição §IV). */
export class BuscarEditais {
  constructor(private readonly repo: EditalRepository) {}

  async buscar(probe: EditalProbe, page?: PaginacaoReq): Promise<EditalView[]> {
    const editais = await this.repo.buscarPorExemplo(probe, page);
    // `numero`/`prazoVigencia` alimentam a tela "Operação · Editais" (Painel Admin). O número
    // oficial (ED-AAAA/NNN) é identificador humano, não montante — RN013 veda valores, não a numeração.
    return editais.map(paraView);
  }

  /**
   * Busca paginada da gestão: itens + total do filtro num só read model. `total` reflete o probe inteiro
   * (não só a página), permitindo ao front montar o pager. `page`/`size` são normalizados e ecoados.
   */
  async buscarPagina(probe: EditalProbe, page?: PaginacaoReq): Promise<PaginaEditais> {
    const size = page?.size && page.size > 0 ? page.size : TAMANHO_PADRAO;
    const p = page?.page && page.page > 0 ? page.page : 1;
    const [items, total] = await Promise.all([
      this.repo.buscarPorExemplo(probe, { page: p, size }),
      this.repo.contarPorExemplo(probe),
    ]);
    return { items: items.map(paraView), total, page: p, size };
  }
}

function paraView(e: Edital): EditalView {
  return { id: e.id, numero: e.numero, objeto: e.objeto, secretariaId: e.secretariaId, situacao: e.situacao, cnaesAlvo: e.cnaesAlvo, prazoVigencia: e.prazoVigencia };
}
