import { randomUUID } from 'node:crypto';
import { Credenciamento } from '../domain/credenciamento.js';
import { CredenciamentoIniciado, TermoAceito, CredenciamentoCancelado } from '../domain/eventos-credenciamento.js';
import type { ListarEditaisCompativeis } from '../../editais/application/listar-editais-compativeis.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { EventBus } from '../../shared/events/event-bus.js';

/** Porta de persistência do agregado Credenciamento (implementada por adaptadores memory/pg). */
export interface CredenciamentoRepository {
  salvar(c: Credenciamento): Promise<void>;
  porId(id: string): Promise<Credenciamento | null>;
  porFornecedorEEdital(fornecedorId: string, editalId: string): Promise<Credenciamento | null>;
}

export type Actor = { userId: string; empresaId?: string };

export class EditalNaoAberto extends Error {
  constructor() { super('Edital is not open for credenciamento.'); this.name = 'EditalNaoAberto'; }
}
export class CredenciamentoNaoEncontrado extends Error {
  constructor() { super('Credenciamento not found.'); this.name = 'CredenciamentoNaoEncontrado'; }
}
export class CredenciamentoDuplicado extends Error {
  constructor() { super('An active credenciamento already exists for this edital.'); this.name = 'CredenciamentoDuplicado'; }
}
export class FornecedorNaoEncontrado extends Error {
  constructor() { super('Supplier not found.'); this.name = 'FornecedorNaoEncontrado'; }
}

/**
 * UC004 — Solicitar Credenciamento e concluir por Termo de Aceite (RN016). Precondição: edital
 * **Aberto** e compatível por CNAE (UC003). O aceite move o fornecedor para `pendente_analise`;
 * o cancelamento (A2) é permitido antes da distribuição. Biometria/liveness (UC007) é R2, fora do MVP.
 */
export class SolicitarCredenciamento {
  constructor(
    private readonly repo: CredenciamentoRepository,
    private readonly vitrine: ListarEditaisCompativeis,
    private readonly fornecedores: FornecedorRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async iniciar(fornecedorId: string, editalId: string, capacidade: number, actor: Actor): Promise<{ credenciamentoId: string }> {
    // Precondição UC003: compatível por CNAE (lança EditalIncompativel → 403). `detalhar` NÃO checa a
    // situação, então a garantia de "Aberto" fica explícita aqui (RN014).
    const edital = await this.vitrine.detalhar(fornecedorId, editalId);
    if (edital.situacao !== 'publicado') throw new EditalNaoAberto();

    const existente = await this.repo.porFornecedorEEdital(fornecedorId, editalId);
    if (existente && existente.situacao !== 'cancelado') throw new CredenciamentoDuplicado();

    const cred = Credenciamento.iniciar({ id: randomUUID(), fornecedorId, editalId, capacidadeTeto: capacidade, userName: actor.userId });
    await this.repo.salvar(cred);
    await this.bus.publish(
      new CredenciamentoIniciado(cred.id, { credenciamentoId: cred.id, fornecedorId, editalId, capacidadeTeto: cred.capacidadeTeto }, { userId: actor.userId, empresaId: fornecedorId })
        .toEnvelope(randomUUID(), this.now()),
    );
    return { credenciamentoId: cred.id };
  }

  async aceitarTermo(credenciamentoId: string, dados: { versaoTermo: string; finalidade: string }, actor: Actor): Promise<{ estado: 'aceito'; status: 'pendente_analise' }> {
    const cred = await this.repo.porId(credenciamentoId);
    if (!cred) throw new CredenciamentoNaoEncontrado();

    const agora = this.now();
    cred.aceitarTermo({ versao: dados.versaoTermo, finalidade: dados.finalidade }, actor.userId, agora);

    const fornecedor = await this.fornecedores.porId(cred.fornecedorId);
    if (!fornecedor) throw new FornecedorNaoEncontrado();
    // O status do fornecedor é global e progride uma vez (Requerente/Em Correção → Pendente de Análise).
    // Um segundo credenciamento (outro edital) não regride nem re-transiciona: só avança quando aplicável.
    if (fornecedor.status === 'requerente' || fornecedor.status === 'em_correcao') {
      fornecedor.enviarParaAnalise(actor.userId);
      await this.fornecedores.salvar(fornecedor);
    }

    await this.repo.salvar(cred);
    await this.bus.publish(
      new TermoAceito(cred.id, {
        credenciamentoId: cred.id, fornecedorId: cred.fornecedorId, editalId: cred.editalId,
        versao: dados.versaoTermo, finalidade: dados.finalidade, aceitoEm: agora,
      }, { userId: actor.userId, empresaId: cred.fornecedorId }).toEnvelope(randomUUID(), agora),
    );
    return { estado: 'aceito', status: 'pendente_analise' };
  }

  async cancelar(credenciamentoId: string, actor: Actor): Promise<{ estado: 'cancelado' }> {
    const cred = await this.repo.porId(credenciamentoId);
    if (!cred) throw new CredenciamentoNaoEncontrado();
    cred.cancelar(actor.userId);
    await this.repo.salvar(cred);
    await this.bus.publish(
      new CredenciamentoCancelado(cred.id, { credenciamentoId: cred.id, fornecedorId: cred.fornecedorId, editalId: cred.editalId }, { userId: actor.userId, empresaId: cred.fornecedorId })
        .toEnvelope(randomUUID(), this.now()),
    );
    return { estado: 'cancelado' };
  }
}
