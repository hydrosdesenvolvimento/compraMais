import { randomUUID } from 'node:crypto';
import { distribuir, REGRA_DESEMPATE_PADRAO } from '../domain/motor.js';
import { montarRegistroPorItem, type ItemDistribuicao, type RegistroDistribuicao } from '../domain/registro-distribuicao.js';
import { DistribuicaoExecutada } from '../domain/eventos.js';
import { montarAptosDoItem } from './montar-aptos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Fonte de leitura mínima do edital para distribuir (Fase 2): guarda de estado + os ITENS do edital
 * (id + quantidade demandada). O rateio roda por item; quem implementa a porta lista os itens.
 */
export interface ItemParaDistribuir { itemId: string; quantidade: number }
export interface EditalParaDistribuir {
  porId(id: string): Promise<{ podeDistribuir: boolean; itens: ItemParaDistribuir[] } | null>;
}

/** Cota vigente de um fornecedor num edital (projeção de leitura para "Demandas distribuídas"). */
export interface CotaFornecedor { editalId: string; cota: number; geradoEm: string; hash: string }

/**
 * Porta de persistência canônica da matriz (append-only — AD-10/AD-24, Story 5.2). Só há `append`:
 * nunca se sobrescreve uma versão. Uma reexecução acrescenta uma nova versão do fato.
 */
export interface DistribuicaoRepository {
  append(r: RegistroDistribuicao): Promise<void>;
  /** Matriz vigente do edital (maior versão), ou null se nunca foi distribuído. */
  ultimaDoEdital(editalId: string): Promise<RegistroDistribuicao | null>;
  /** Nº de versões já registradas do edital (para numerar o próximo append). */
  contarDoEdital(editalId: string): Promise<number>;
  /** Cotas > 0 do fornecedor, a partir da matriz vigente de cada edital em que foi alocado. */
  cotasDoFornecedor(fornecedorId: string): Promise<CotaFornecedor[]>;
}

export class EditalNaoEncontrado extends Error {
  constructor() { super('Edital not found.'); this.name = 'EditalNaoEncontrado'; }
}
export class EditalNaoDistribuivel extends Error {
  constructor() { super('Edital is not in a distributable state (published tender required).'); this.name = 'EditalNaoDistribuivel'; }
}
export class EditalSemItens extends Error {
  constructor() { super('Edital has no items to distribute.'); this.name = 'EditalSemItens'; }
}

/**
 * Executa o Motor de Distribuição (UC008 / RF005, Story 5.1+5.2). Reúne os aptos (credenciados
 * `aceito` do edital, cada um com seu teto declarado RN005), invoca o kernel puro `distribuir` e
 * grava o registro canônico append-only. Guarda de estado: só roda quando o edital pode distribuir
 * (publicado). Reexecutar acrescenta uma nova versão; a matriz vigente é sempre a de maior versão.
 */
export class ExecutarDistribuicao {
  constructor(
    private readonly editais: EditalParaDistribuir,
    private readonly creds: CredenciamentoRepository,
    private readonly fornecedores: FornecedorRepository,
    private readonly repo: DistribuicaoRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(editalId: string, actor: Actor): Promise<RegistroDistribuicao> {
    const e = await this.editais.porId(editalId);
    if (!e) throw new EditalNaoEncontrado();
    if (!e.podeDistribuir) throw new EditalNaoDistribuivel(); // guarda de estado
    if (e.itens.length === 0) throw new EditalSemItens();

    // Rateio POR ITEM (Fase 2): cada item distribui a sua quantidade entre os credenciados NAQUELE item,
    // com o teto declarado do item. Item sem credenciado vira déficit total (não chama o motor — que
    // lançaria SemAptos). O kernel `distribuir` é puro e reprodutível (RNF008).
    const itens: ItemDistribuicao[] = [];
    for (const it of e.itens) {
      const aptos = await montarAptosDoItem(this.creds, this.fornecedores, editalId, it.itemId);
      if (aptos.length === 0) {
        itens.push({ itemId: it.itemId, demanda: it.quantidade, distribuido: 0, deficit: true, deficitQuantidade: it.quantidade, alocacoes: [] });
        continue;
      }
      const r = distribuir({ demanda: it.quantidade, aptos });
      itens.push({
        itemId: it.itemId, demanda: r.demandaTotal, distribuido: r.quantidadeDistribuida,
        deficit: r.deficit, deficitQuantidade: r.deficitQuantidade,
        alocacoes: r.alocacoes.map((a) => ({ fornecedorId: a.id, cota: a.cota })),
      });
    }

    const versao = (await this.repo.contarDoEdital(editalId)) + 1;
    const registro = montarRegistroPorItem({ id: randomUUID(), editalId, versao, geradoEm: this.now(), regraDesempate: REGRA_DESEMPATE_PADRAO, itens });
    await this.repo.append(registro); // append-only — jamais sobrescreve versões anteriores (AD-10)

    await this.bus.publish(
      new DistribuicaoExecutada(
        editalId,
        { editalId, versao, hash: registro.hash, regraDesempate: registro.regraDesempate, deficit: registro.deficit },
        actor,
      ).toEnvelope(randomUUID(), this.now()),
    );
    return registro;
  }
}
