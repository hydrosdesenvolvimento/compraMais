import { randomUUID } from 'node:crypto';
import { Edital } from '../domain/edital.js';
import { EditalCriado, EditalPublicado, EditalEncerrado, EditalEditado, PublicoAlvoAmpliado } from '../domain/eventos.js';
import type { EditalRepository } from './listar-editais-compativeis.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

export class EditalNaoEncontrado extends Error {
  constructor() { super('Edital não encontrado.'); this.name = 'EditalNaoEncontrado'; }
}
export class CnaeInvalido extends Error {
  constructor(cnae: string) { super(`CNAE inválido: ${cnae} (esperado subclasse de 7 dígitos).`); this.name = 'CnaeInvalido'; }
}

/** Validação de CNAE (FR-012). Default valida formato (subclasse 7 dígitos); o adaptador real consulta a ACL da Receita. */
export interface CnaeValidator { validar(cnaes: readonly string[]): Promise<void>; }
export class CnaeFormatoValidator implements CnaeValidator {
  async validar(cnaes: readonly string[]): Promise<void> {
    for (const c of cnaes) if (!/^\d{7}$/.test(c)) throw new CnaeInvalido(c);
  }
}

/** Checagem de pendências para encerrar (FR-005/contrato): bloqueia se há contestações pendentes. */
export interface ContestacoesPendentesQuery { pendentesDe(editalId: string): Promise<number>; }

export class GerirEditais {
  constructor(
    private readonly repo: EditalRepository,
    private readonly bus: EventBus,
    private readonly cnaes: CnaeValidator = new CnaeFormatoValidator(),
    private readonly contestacoes?: ContestacoesPendentesQuery,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async criar(input: { secretariaId: string; objeto: string; cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string }, actor: Actor): Promise<{ editalId: string }> {
    await this.cnaes.validar(input.cnaesAlvo);
    const id = randomUUID();
    const edital = Edital.criar({ id, ...input, userName: actor.userId });
    await this.repo.salvar(edital);
    await this.bus.publish(new EditalCriado(id, { editalId: id, secretariaId: input.secretariaId }, actor).toEnvelope(randomUUID(), this.now()));
    return { editalId: id };
  }

  async publicar(editalId: string, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    e.publicar(actor.userId);
    await this.repo.salvar(e);
    await this.bus.publish(new EditalPublicado(editalId, { editalId }, actor).toEnvelope(randomUUID(), this.now()));
  }

  async editar(editalId: string, campos: Partial<{ objeto: string; cnaesAlvo: string[]; quantitativos: number; prazoVigencia: string | null }>, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    if (campos.cnaesAlvo) await this.cnaes.validar(campos.cnaesAlvo);
    const { diff, ampliouPublico } = e.editar(campos, actor.userId);
    if (diff.length === 0) return;
    await this.repo.salvar(e);
    await this.bus.publish(new EditalEditado(editalId, { editalId, diff }, actor).toEnvelope(randomUUID(), this.now()));
    if (ampliouPublico) {
      // FR-014: vitrine reavaliada (situação já é consultada ao listar); prazo mantido; só sinaliza.
      await this.bus.publish(new PublicoAlvoAmpliado(editalId, { editalId, cnaesAlvo: [...e.cnaesAlvo] }, actor).toEnvelope(randomUUID(), this.now()));
    }
  }

  async encerrar(editalId: string, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    if (this.contestacoes) {
      const pendentes = await this.contestacoes.pendentesDe(editalId);
      if (pendentes > 0) throw new ContestacoesPendentes(pendentes);
    }
    e.encerrar(actor.userId);
    await this.repo.salvar(e);
    await this.bus.publish(new EditalEncerrado(editalId, { editalId }, actor).toEnvelope(randomUUID(), this.now()));
  }

  private async exigir(editalId: string): Promise<Edital> {
    const e = await this.repo.porId(editalId);
    if (!e) throw new EditalNaoEncontrado();
    return e;
  }
}

export class ContestacoesPendentes extends Error {
  constructor(n: number) { super(`Há ${n} contestação(ões) de CNAE pendente(s); resolva antes de encerrar.`); this.name = 'ContestacoesPendentes'; }
}
