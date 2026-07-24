import { randomUUID } from 'node:crypto';
import { distribuir } from '../domain/motor.js';
import { montarRegistro, type RegistroDistribuicao } from '../domain/registro-distribuicao.js';
import { DistribuicaoExecutada } from '../domain/eventos.js';
import { montarAptosDoEdital } from './montar-aptos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

type Actor = { userId: string; empresaId?: string };

/**
 * Fonte de leitura mínima do edital para distribuir: guarda de estado + demanda total. A `demanda`
 * deixou de ser um campo do edital e passa a ser a **soma das quantidades dos itens** (o edital não tem
 * mais quantitativo agregado); quem implementa a porta faz essa soma.
 */
export interface EditalParaDistribuir {
  porId(id: string): Promise<{ podeDistribuir: boolean; demanda: number } | null>;
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

    const aptos = await montarAptosDoEdital(this.creds, this.fornecedores, editalId);

    // Kernel puro (AD-7/AD-24): lança SemAptos se `aptos` vazio, DemandaInvalida se demanda ≤ 0.
    const resultado = distribuir({ demanda: e.demanda, aptos });
    const versao = (await this.repo.contarDoEdital(editalId)) + 1;
    const registro = montarRegistro({ id: randomUUID(), editalId, versao, geradoEm: this.now(), resultado });
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
