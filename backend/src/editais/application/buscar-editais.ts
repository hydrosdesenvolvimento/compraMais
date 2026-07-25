import type { Edital } from '../domain/edital.js';
import type { EditalRepository, EditalProbe, PaginacaoReq } from './listar-editais-compativeis.js';

/** Read model de um edital na busca de gestão (número/quantitativo/prazo alimentam a tela "Operação · Editais"). */
export interface EditalView { id: string; numero: string; objeto: string; secretariaId: string; situacao: string; cnaesAlvo: readonly string[]; prazoVigencia: string | null; qtdItens: number }

/** Página de resultados: itens da página corrente + total do filtro (pager) + eco de page/size aplicados. */
export interface PaginaEditais { items: EditalView[]; total: number; page: number; size: number }

const TAMANHO_PADRAO = 20;

/** Consulta de editais por instância parcial (QBE — FR-011 / Constituição §IV). */
export class BuscarEditais {
  // `contarItens` é opcional (injetado no wiring): sem ele, `qtdItens = 0` (ex.: testes que só exercem o filtro).
  constructor(private readonly repo: EditalRepository, private readonly contarItens?: (editalId: string) => Promise<number>) {}

  async buscar(probe: EditalProbe, page?: PaginacaoReq): Promise<EditalView[]> {
    const editais = await this.repo.buscarPorExemplo(probe, page);
    // `numero`/`prazoVigencia` alimentam a tela "Operação · Editais" (Painel Admin). O número
    // oficial (ED-AAAA/NNN) é identificador humano, não montante — RN013 veda valores, não a numeração.
    return this.enriquecer(editais);
  }

  /** Anexa a contagem de itens de cada edital (nº de itens da tela "Operação · Editais"). */
  private async enriquecer(editais: Edital[]): Promise<EditalView[]> {
    return Promise.all(editais.map(async (e) => ({ ...paraView(e), qtdItens: this.contarItens ? await this.contarItens(e.id) : 0 })));
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
    return { items: await this.enriquecer(items), total, page: p, size };
  }
}

function paraView(e: Edital): EditalView {
  return { id: e.id, numero: e.numero, objeto: e.objeto, secretariaId: e.secretariaId, situacao: e.situacao, cnaesAlvo: e.cnaesAlvo, prazoVigencia: e.prazoVigencia, qtdItens: 0 };
}
