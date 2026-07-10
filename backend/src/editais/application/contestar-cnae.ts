import { randomUUID } from 'node:crypto';
import { ContestacaoCnae } from '../domain/contestacao-cnae.js';
import { ContestacaoCnaeAberta, ContestacaoCnaeAcatada, ContestacaoCnaeRecusada } from '../domain/eventos.js';
import type { EditalRepository } from './listar-editais-compativeis.js';
import type { GerirEditais } from './gerir-editais.js';
import type { ContestacoesPendentesQuery } from './gerir-editais.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import { EditalNaoEncontrado } from './gerir-editais.js';

type Actor = { userId: string; empresaId?: string };

export interface ContestacaoRepository extends ContestacoesPendentesQuery {
  salvar(c: ContestacaoCnae): Promise<void>;
  porId(id: string): Promise<ContestacaoCnae | null>;
  doEdital(editalId: string): Promise<ContestacaoCnae[]>;
  /** Contestações pendentes abertas por um fornecedor (consolidação — tela única, Épico 7-1). */
  pendentesDoFornecedor(fornecedorId: string): Promise<ContestacaoCnae[]>;
}

/** Verifica se um fornecedor está cadastrado e ativo (legitimidade — clarify Q3). */
export interface FornecedorAtivoQuery { estaAtivo(fornecedorId: string): Promise<boolean>; }

export class FornecedorNaoLegitimo extends Error {
  constructor() { super('Only a registered and active supplier can file a challenge.'); this.name = 'FornecedorNaoLegitimo'; }
}
export class ContestacaoNaoEncontrada extends Error {
  constructor() { super('Challenge not found.'); this.name = 'ContestacaoNaoEncontrada'; }
}

/** US2 — abertura de contestação de CNAE (FR-007). Qualquer fornecedor cadastrado/ativo (clarify Q3). */
export class ContestarCnae {
  constructor(
    private readonly editais: EditalRepository,
    private readonly contestacoes: ContestacaoRepository,
    private readonly fornecedores: FornecedorAtivoQuery,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async abrir(editalId: string, fornecedorId: string, cnaeContestado: string, justificativa: string): Promise<{ contestacaoId: string }> {
    if (!(await this.editais.porId(editalId))) throw new EditalNaoEncontrado();
    if (!(await this.fornecedores.estaAtivo(fornecedorId))) throw new FornecedorNaoLegitimo();
    const id = randomUUID();
    const c = ContestacaoCnae.abrir({ id, editalId, fornecedorId, cnaeContestado, justificativa });
    await this.contestacoes.salvar(c);
    await this.bus.publish(new ContestacaoCnaeAberta(editalId, { contestacaoId: id, editalId, cnae: cnaeContestado }, { userId: fornecedorId, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
    return { contestacaoId: id };
  }
}

/** US2 — resolução pela Secretaria/CPL (FR-008/009). Acatar corrige o CNAE do edital (com histórico via EditalEditado). */
export class ResolverContestacao {
  constructor(
    private readonly contestacoes: ContestacaoRepository,
    private readonly editais: GerirEditais,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async acatar(contestacaoId: string, novoCnaes: string[], actor: Actor): Promise<void> {
    const c = await this.exigir(contestacaoId);
    c.acatar(actor.userId);
    await this.contestacoes.salvar(c);
    // corrige o CNAE do edital via edição auditada (gera EditalEditado com antes/depois)
    await this.editais.editar(c.editalId, { cnaesAlvo: novoCnaes }, actor);
    await this.bus.publish(new ContestacaoCnaeAcatada(c.editalId, { contestacaoId, editalId: c.editalId }, actor).toEnvelope(randomUUID(), this.now()));
  }

  async recusar(contestacaoId: string, motivo: string, actor: Actor): Promise<void> {
    const c = await this.exigir(contestacaoId);
    c.recusar(motivo, actor.userId);
    await this.contestacoes.salvar(c);
    await this.bus.publish(new ContestacaoCnaeRecusada(c.editalId, { contestacaoId, editalId: c.editalId, motivo }, actor).toEnvelope(randomUUID(), this.now()));
  }

  private async exigir(id: string): Promise<ContestacaoCnae> {
    const c = await this.contestacoes.porId(id);
    if (!c) throw new ContestacaoNaoEncontrada();
    return c;
  }
}
