import { randomUUID } from 'node:crypto';
import { Credenciamento, type CapacidadeItem } from '../domain/credenciamento.js';
import { CredenciamentoIniciado, TermoAceito, CredenciamentoCancelado } from '../domain/eventos-credenciamento.js';
import type { ListarEditaisCompativeis } from '../../editais/application/listar-editais-compativeis.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';
import type { EventBus } from '../../shared/events/event-bus.js';

/** Porta de persistência do agregado Credenciamento (implementada por adaptadores memory/pg). */
export interface CredenciamentoRepository {
  salvar(c: Credenciamento): Promise<void>;
  porId(id: string): Promise<Credenciamento | null>;
  porFornecedorEEdital(fornecedorId: string, editalId: string): Promise<Credenciamento | null>;
  /** Todos os credenciamentos do fornecedor (qualquer estado), do mais recente ao mais antigo. */
  listarPorFornecedor(fornecedorId: string): Promise<Credenciamento[]>;
  /** Todos os credenciamentos de um edital (qualquer estado) — base dos aptos do Motor (UC008). */
  listarPorEdital(editalId: string): Promise<Credenciamento[]>;
}

export type Actor = { userId: string; empresaId?: string };

/** Leitura mínima dos itens de um edital — valida que a capacidade declarada aponta itens do edital. */
export interface ItensDoEditalQuery { idsDoEdital(editalId: string): Promise<string[]>; }

export class EditalNaoAberto extends Error {
  constructor() { super('Edital is not open for credenciamento.'); this.name = 'EditalNaoAberto'; }
}
export class ItemForaDoEdital extends Error {
  constructor(itemId: string) { super(`Item '${itemId}' does not belong to this edital.`); this.name = 'ItemForaDoEdital'; }
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
    private readonly itensEdital?: ItensDoEditalQuery,
  ) {}

  /**
   * Passo 1 (Capacidade). Bimodal: `itens` (novo — capacidade por item do edital, RN005) ou `capacidade`
   * (legado — teto único nível-edital). Com itens, valida que cada `itemId` pertence ao edital.
   */
  async iniciar(fornecedorId: string, editalId: string, entrada: { itens?: CapacidadeItem[]; capacidade?: number }, actor: Actor): Promise<{ credenciamentoId: string }> {
    // Precondição UC003: compatível por CNAE (lança EditalIncompativel → 403). `detalhar` NÃO checa a
    // situação, então a garantia de "Aberto" fica explícita aqui (RN014).
    const edital = await this.vitrine.detalhar(fornecedorId, editalId);
    if (edital.situacao !== 'publicado') throw new EditalNaoAberto();

    const existente = await this.repo.porFornecedorEEdital(fornecedorId, editalId);
    if (existente && existente.situacao !== 'cancelado') throw new CredenciamentoDuplicado();

    const itens = entrada.itens ?? [];
    if (itens.length > 0 && this.itensEdital) {
      const validos = new Set(await this.itensEdital.idsDoEdital(editalId));
      for (const it of itens) if (!validos.has(it.itemId)) throw new ItemForaDoEdital(it.itemId);
    }

    const cred = Credenciamento.iniciar({ id: randomUUID(), fornecedorId, editalId, itens: itens.length ? itens : undefined, capacidadeTeto: entrada.capacidade, userName: actor.userId });
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
    // A prova de vida (UC007) só é exigida quando o EDITAL a exige (definido no cadastro). Lê a política
    // vigente do edital (sem re-checar compatibilidade — já validada no início) e a repassa à guarda.
    const edital = await this.vitrine.porId(cred.editalId);
    cred.aceitarTermo({ versao: dados.versaoTermo, finalidade: dados.finalidade }, actor.userId, agora, edital?.exigeProvaDeVida ?? false);

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

  /**
   * Registra o passo do wizard em que o fornecedor está (UC004) para a tela "Meus Credenciamentos"
   * mostrar "Etapa n/N" e o "Continuar" retomar de onde parou. É estado de UI do agregado — não gera
   * evento de negócio (a trilha AD-18 guarda início/aceite/cancelamento, não a navegação do wizard).
   */
  async registrarPasso(credenciamentoId: string, passo: number, actor: Actor): Promise<{ passoAtual: number }> {
    const cred = await this.repo.porId(credenciamentoId);
    if (!cred) throw new CredenciamentoNaoEncontrado();
    cred.registrarPasso(passo, actor.userId);
    await this.repo.salvar(cred);
    return { passoAtual: cred.passoAtual };
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
