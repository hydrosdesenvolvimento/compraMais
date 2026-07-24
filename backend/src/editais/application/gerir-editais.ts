import { randomUUID } from 'node:crypto';
import { Edital, EditalNaoEditavel } from '../domain/edital.js';
import { formatarNumeroEdital } from '../domain/numero-edital.js';
import { EditalCriado, EditalPublicado, EditalEncerrado, EditalEditado, EditalDespublicado, PublicoAlvoAmpliado } from '../domain/eventos.js';
import type { EditalRepository } from './listar-editais-compativeis.js';
import type { NumeradorEditais } from './numerador-editais.js';
import { NumeradorEditaisMemory } from '../adapters/numerador-editais-memory.js';
import type { EventBus } from '../../shared/events/event-bus.js';

type Actor = { userId: string; empresaId?: string };

export class EditalNaoEncontrado extends Error {
  constructor() { super('Edital not found.'); this.name = 'EditalNaoEncontrado'; }
}
export class CnaeInvalido extends Error {
  constructor(cnae: string) { super(`Invalid CNAE: ${cnae} (expected a 7-digit subclass).`); this.name = 'CnaeInvalido'; }
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

/** Quantidade de credenciamentos associados a um edital — base da guarda da despublicação. */
export interface CredenciamentosDoEditalQuery { contarDoEdital(editalId: string): Promise<number>; }

export class GerirEditais {
  constructor(
    private readonly repo: EditalRepository,
    private readonly bus: EventBus,
    private readonly cnaes: CnaeValidator = new CnaeFormatoValidator(),
    private readonly contestacoes?: ContestacoesPendentesQuery,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly numerador: NumeradorEditais = new NumeradorEditaisMemory(),
    private readonly credenciamentos?: CredenciamentosDoEditalQuery,
  ) {}

  /**
   * Cria o edital em rascunho já com a numeração oficial do ano corrente (ED-AAAA/NNN). O número é
   * reservado pelo `NumeradorEditais` (atômico) e é imutável: `editar` não o alcança.
   */
  async criar(input: { secretariaId: string; objeto: string; cnaesAlvo: string[]; prazoVigencia: string }, actor: Actor): Promise<{ editalId: string; numero: string }> {
    await this.cnaes.validar(input.cnaesAlvo);
    const id = randomUUID();
    const ano = new Date(this.now()).getUTCFullYear();
    const numero = formatarNumeroEdital(ano, await this.numerador.proximo(ano));
    const edital = Edital.criar({ id, numero, ...input, userName: actor.userId });
    await this.repo.salvar(edital);
    await this.bus.publish(new EditalCriado(id, { editalId: id, numero, secretariaId: input.secretariaId }, actor).toEnvelope(randomUUID(), this.now()));
    return { editalId: id, numero };
  }

  async publicar(editalId: string, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    e.publicar(actor.userId);
    await this.repo.salvar(e);
    await this.bus.publish(new EditalPublicado(editalId, { editalId }, actor).toEnvelope(randomUUID(), this.now()));
  }

  /**
   * Edição INTERNA (primitiva). Sem guarda de situação de propósito: a contestação de CNAE acatada
   * (FR-014) amplia o público-alvo de um edital JÁ PUBLICADO por aqui. A edição iniciada pela gestão
   * usa `editarComoRascunho`, que aplica a guarda de estado.
   */
  async editar(editalId: string, campos: Partial<{ objeto: string; cnaesAlvo: string[]; prazoVigencia: string | null }>, actor: Actor): Promise<void> {
    await this.aplicarEdicao(await this.exigir(editalId), campos, actor);
  }

  /**
   * Edição pela gestão (FR-013): só permitida enquanto o edital está em RASCUNHO (não publicado). Um
   * edital publicado precisa ser despublicado antes (e só pode, sem credenciamentos associados).
   */
  async editarComoRascunho(editalId: string, campos: Partial<{ objeto: string; cnaesAlvo: string[]; prazoVigencia: string | null }>, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    if (e.situacao !== 'rascunho') throw new EditalNaoEditavel(e.situacao);
    await this.aplicarEdicao(e, campos, actor);
  }

  private async aplicarEdicao(e: Edital, campos: Partial<{ objeto: string; cnaesAlvo: string[]; prazoVigencia: string | null }>, actor: Actor): Promise<void> {
    if (campos.cnaesAlvo) await this.cnaes.validar(campos.cnaesAlvo);
    const editalId = e.id;
    const { diff, ampliouPublico } = e.editar(campos, actor.userId);
    if (diff.length === 0) return;
    await this.repo.salvar(e);
    await this.bus.publish(new EditalEditado(editalId, { editalId, diff }, actor).toEnvelope(randomUUID(), this.now()));
    if (ampliouPublico) {
      // FR-014: vitrine reavaliada (situação já é consultada ao listar); prazo mantido; só sinaliza.
      await this.bus.publish(new PublicoAlvoAmpliado(editalId, { editalId, cnaesAlvo: [...e.cnaesAlvo] }, actor).toEnvelope(randomUUID(), this.now()));
    }
  }

  /**
   * Despublica o edital (publicado → rascunho), devolvendo-o à edição. Bloqueada se houver QUALQUER
   * credenciamento associado ao edital (em qualquer estado) — despublicar apagaria o contexto que os
   * fornecedores viram ao aderir. Sem a query injetada, a checagem é dispensada (testes sem credenciamento).
   */
  async despublicar(editalId: string, actor: Actor): Promise<void> {
    const e = await this.exigir(editalId);
    if (this.credenciamentos) {
      const n = await this.credenciamentos.contarDoEdital(editalId);
      if (n > 0) throw new EditalComCredenciamentos(n);
    }
    e.despublicar(actor.userId);
    await this.repo.salvar(e);
    await this.bus.publish(new EditalDespublicado(editalId, { editalId }, actor).toEnvelope(randomUUID(), this.now()));
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
  constructor(n: number) { super(`There are ${n} pending CNAE challenge(s); resolve them before closing.`); this.name = 'ContestacoesPendentes'; }
}
export class EditalComCredenciamentos extends Error {
  constructor(n: number) { super(`Edital has ${n} associated credenciamento(s); it cannot be unpublished.`); this.name = 'EditalComCredenciamentos'; }
}
