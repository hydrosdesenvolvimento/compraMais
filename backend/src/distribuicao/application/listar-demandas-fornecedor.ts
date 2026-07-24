import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { DistribuicaoRepository } from './executar-distribuicao.js';

/** Um item do edital para o detalhamento por item da demanda distribuída (Fase 3). */
export interface EditalItemDemanda { itemId: string; numero: number; nome: string; unidade: string; quantidade: number }

/** Resumo do edital para exibir a demanda distribuída (número/objeto/secretaria/estado + itens). */
export interface EditalResumoDemanda {
  porId(id: string): Promise<{ numero: string; objeto: string; secretariaId: string; situacao: string; itens: EditalItemDemanda[] } | null>;
}

/** Sigla da secretaria (ex.: SEME) a partir do id livre gravado no edital (UC020). */
export interface SecretariaSiglaLookup {
  siglaPorId(id: string): Promise<string | null>;
}

/**
 * Projeção de leitura da tela "Demandas distribuídas" (UC008 / RF005). Para cada edital em que o
 * fornecedor tem credenciamento `aceito` E já houve distribuição, classifica o vínculo:
 *  - `titular`  → o fornecedor recebeu cota na matriz vigente; expõe o rateio (total/aptos/cota/teto);
 *  - `reserva`  → é apto (aceito) mas NÃO está na matriz vigente (credenciou-se após a distribuição
 *                 inicial → Cadastro de Reserva / 2ª Demanda, UC009). Sem cota; só o teto declarado.
 * Editais sem distribuição ainda não aparecem (a tela mostra o rateio já realizado). Somente leitura.
 */
/** Detalhe da distribuição do fornecedor em UM item do edital (Fase 3). */
export interface DemandaItemView {
  itemId: string;
  numero: number;
  nome: string;
  unidade: string;
  demanda: number; // demanda do item
  cota: number; // cota do fornecedor no item (0 quando não recebeu — ex.: reserva)
  teto: number; // teto declarado do fornecedor no item (RN005)
}

export interface DemandaDistribuidaView {
  editalId: string;
  numero: string;
  secretariaSigla: string | null;
  objeto: string;
  classificacao: 'titular' | 'reserva';
  /** Demanda total do edital (RN005). `null` no Cadastro de Reserva (não participou do rateio). */
  total: number | null;
  /** Fornecedores que receberam cota na matriz vigente. `null` no Cadastro de Reserva. */
  aptos: number | null;
  /** Cota final alocada ao fornecedor (soma dos itens). `null` no Cadastro de Reserva. */
  cota: number | null;
  /** Capacidade declarada AGREGADA (soma dos tetos dos itens, RN005). Sempre presente. */
  teto: number;
  /** Detalhamento por item (Fase 3): a cota/teto do fornecedor em cada item que ele declarou. */
  itens: DemandaItemView[];
  geradoEm: string; // ISO da matriz vigente
  hash: string; // protocolo de reprodutibilidade da matriz (AD-24)
}

export class ListarDemandasFornecedor {
  constructor(
    private readonly creds: CredenciamentoRepository,
    private readonly repo: DistribuicaoRepository,
    private readonly editais: EditalResumoDemanda,
    private readonly secretarias: SecretariaSiglaLookup,
  ) {}

  async listar(fornecedorId: string): Promise<DemandaDistribuidaView[]> {
    const aceitos = (await this.creds.listarPorFornecedor(fornecedorId)).filter((c) => c.situacao === 'aceito');
    // Um único credenciamento aceito por edital (RN005/UC004); dedupe defensivo pelo mais recente.
    const porEdital = new Map<string, (typeof aceitos)[number]>();
    for (const c of aceitos) if (!porEdital.has(c.editalId)) porEdital.set(c.editalId, c);

    const views: DemandaDistribuidaView[] = [];
    for (const c of porEdital.values()) {
      const matriz = await this.repo.ultimaDoEdital(c.editalId);
      if (!matriz) continue; // ainda não distribuído — fora da tela
      const edital = await this.editais.porId(c.editalId);
      if (!edital) continue; // edital removido — sem contexto para exibir

      const alocado = matriz.alocacoes.find((a) => a.fornecedorId === fornecedorId && a.cota > 0);
      const secretariaSigla = await this.secretarias.siglaPorId(edital.secretariaId);

      // Detalhamento POR ITEM (Fase 3): para cada item que o fornecedor declarou, a demanda do item,
      // a sua cota (da matriz por item) e o teto declarado. Enriquecido com os metadados do edital.
      const metaItem = new Map(edital.itens.map((i) => [i.itemId, i]));
      const itens: DemandaItemView[] = c.itens.map((ci) => {
        const mi = matriz.itens.find((x) => x.itemId === ci.itemId);
        const meta = metaItem.get(ci.itemId);
        return {
          itemId: ci.itemId,
          numero: meta?.numero ?? 0,
          nome: meta?.nome ?? ci.itemId,
          unidade: meta?.unidade ?? '',
          demanda: mi?.demanda ?? meta?.quantidade ?? 0,
          cota: mi?.alocacoes.find((a) => a.fornecedorId === fornecedorId)?.cota ?? 0,
          teto: ci.capacidadeTeto,
        };
      });

      const base = {
        editalId: c.editalId,
        numero: edital.numero,
        secretariaSigla,
        objeto: edital.objeto,
        teto: c.capacidadeTeto,
        itens,
        geradoEm: matriz.geradoEm,
        hash: matriz.hash,
      };
      if (alocado) {
        views.push({
          ...base,
          classificacao: 'titular',
          total: matriz.demandaTotal,
          aptos: matriz.alocacoes.filter((a) => a.cota > 0).length,
          cota: alocado.cota,
        });
      } else {
        views.push({ ...base, classificacao: 'reserva', total: null, aptos: null, cota: null });
      }
    }
    // Mais recentes primeiro (data da matriz vigente).
    return views.sort((a, b) => b.geradoEm.localeCompare(a.geradoEm));
  }
}
