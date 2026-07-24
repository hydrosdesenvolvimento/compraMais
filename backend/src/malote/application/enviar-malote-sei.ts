import { randomUUID } from 'node:crypto';
import type { MaloteRepository } from './gerar-malote.js';
import { MaloteProtocoladoSei } from '../domain/eventos.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { SeiGateway } from '../../shared/acl/sei/sei-gateway.js';

type Actor = { userId: string; empresaId?: string };

export class MaloteNaoEncontrado extends Error {
  constructor() { super('Malote not found.'); this.name = 'MaloteNaoEncontrado'; }
}
export class MaloteNaoGeradoParaSei extends Error {
  constructor() { super('Malote must be generated before sending to SEI.'); this.name = 'MaloteNaoGeradoParaSei'; }
}
export class SeiIndisponivel extends Error {
  constructor() { super('SEI unavailable — the process was not created; try again later.'); this.name = 'SeiIndisponivel'; }
}

export interface EnvioSeiResultado {
  maloteId: string;
  numeroProcesso: string;
  idProtocolo: string;
  url?: string;
  jaProtocolado: boolean;
}

/**
 * Push: envia um malote GERADO ao SEI (integração — Épico 6). Cria um processo no SEI (tipo configurado
 * do órgão), grava o número/protocolo no malote e o marca `exportado`. Idempotente: se o malote já tem
 * protocolo, devolve o existente sem reprotocolar (não duplica processo no SEI).
 *
 * Fail-open do gateway: se o SEI estiver indisponível (`frescor: 'indisponivel'`), NÃO grava nada e
 * lança `SeiIndisponivel` (o gestor tenta de novo) — não deixa o malote num estado meio-protocolado.
 */
export class EnviarMaloteSei {
  constructor(
    private readonly repo: MaloteRepository,
    private readonly sei: SeiGateway,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(maloteId: string, actor: Actor): Promise<EnvioSeiResultado> {
    const malote = await this.repo.porId(maloteId);
    if (!malote) throw new MaloteNaoEncontrado();

    // Já protocolado → idempotente (sem nova chamada ao SEI).
    const jaProtocolo = malote.protocoloSei;
    if (jaProtocolo) {
      return { maloteId, numeroProcesso: jaProtocolo.numeroProcesso, idProtocolo: jaProtocolo.idProtocolo, url: jaProtocolo.url, jaProtocolado: true };
    }
    if (malote.status !== 'gerado') throw new MaloteNaoGeradoParaSei();

    const especificacao = `Credenciamento — malote ${maloteId} (edital ${malote.editalId}, fornecedor ${malote.fornecedorId})`;
    const res = await this.sei.criarProcesso({ especificacao, nivelAcesso: 'restrito' });
    if (res.frescor === 'indisponivel' || !res.valor) throw new SeiIndisponivel();

    const { jaProtocolado, protocolo } = malote.registrarEnvioSei(
      { numeroProcesso: res.valor.numero, idProtocolo: res.valor.idProtocolo, url: res.valor.url },
      actor.userId,
    );
    await this.repo.salvar(malote);
    await this.bus.publish(
      new MaloteProtocoladoSei(maloteId, { maloteId, numeroProcesso: protocolo.numeroProcesso, idProtocolo: protocolo.idProtocolo }, actor)
        .toEnvelope(randomUUID(), this.now()),
    );
    return { maloteId, numeroProcesso: protocolo.numeroProcesso, idProtocolo: protocolo.idProtocolo, url: protocolo.url, jaProtocolado };
  }
}
