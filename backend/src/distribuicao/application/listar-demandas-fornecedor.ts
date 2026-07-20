import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { DistribuicaoRepository } from './executar-distribuicao.js';

/** Resumo do edital para exibir a demanda distribuída (número/objeto/secretaria/estado). */
export interface EditalResumoDemanda {
  porId(id: string): Promise<{ numero: string; objeto: string; secretariaId: string; situacao: string } | null>;
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
  /** Cota final alocada ao fornecedor. `null` no Cadastro de Reserva. */
  cota: number | null;
  /** Capacidade declarada (teto do rateio, RN005). Sempre presente. */
  teto: number;
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
      const base = {
        editalId: c.editalId,
        numero: edital.numero,
        secretariaSigla,
        objeto: edital.objeto,
        teto: c.capacidadeTeto,
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
