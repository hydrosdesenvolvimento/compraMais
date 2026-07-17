import { randomUUID } from 'node:crypto';
import { distribuir, type AptoDistribuicao } from '../domain/motor.js';
import { montarRegistro, type RegistroDistribuicao } from '../domain/registro-distribuicao.js';
import { DistribuicaoExecutada } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

type Actor = { userId: string; empresaId?: string };

/** Fonte de leitura mínima do edital para distribuir (guarda de estado AD-37 + demanda). */
export interface EditalParaDistribuir {
  porId(id: string): Promise<{ podeDistribuir: boolean; quantitativos: number } | null>;
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
  constructor() { super('Edital is not in the distribution state (AD-37: em_distribuicao required).'); this.name = 'EditalNaoDistribuivel'; }
}

/**
 * Executa o Motor de Distribuição (UC008 / RF005, Story 5.1+5.2). Reúne os aptos (credenciados
 * `aceito` do edital, cada um com seu teto declarado RN005), invoca o kernel puro `distribuir` e
 * grava o registro canônico append-only. Guarda AD-37: só roda quando o edital está `em_distribuicao`.
 * Reexecutar antes da homologação acrescenta uma nova versão; homologado (congelado), a guarda barra.
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
    if (!e.podeDistribuir) throw new EditalNaoDistribuivel(); // guarda AD-37

    const aceitos = (await this.creds.listarPorEdital(editalId)).filter((c) => c.situacao === 'aceito');
    const aptos: AptoDistribuicao[] = [];
    for (const c of aceitos) {
      const f = await this.fornecedores.porId(c.fornecedorId);
      aptos.push({
        id: c.fornecedorId,
        teto: c.capacidadeTeto, // teto declarado (RN005)
        ordemCredenciamento: Date.parse(c.registerDate), // ordem de credenciamento — desempate primário (§8)
        cnpj: f?.cnpj.valor ?? c.fornecedorId, // desempate secundário; fallback estável se o fornecedor sumiu
      });
    }

    // Kernel puro (AD-7/AD-24): lança SemAptos se `aptos` vazio, DemandaInvalida se demanda ≤ 0.
    const resultado = distribuir({ demanda: e.quantitativos, aptos });
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
