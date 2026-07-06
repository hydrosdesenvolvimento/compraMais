import { randomUUID } from 'node:crypto';
import type { FornecedorRepository } from './fornecedor-repository.js';
import type { ReceitaGateway } from '../../shared/acl/receita/receita-gateway.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import { FornecedorSincronizado, PerfilEditado } from '../domain/eventos.js';
import type { ContatoEditavel } from '../domain/fornecedor.js';

const CAMPOS_EDITAVEIS = ['nomeFantasia', 'endereco', 'telefone'] as const;

/** Resultado da re-sincronização (UC018): status + proveniência `{quando, fonte}` para a "Minha conta". */
export interface ResultadoSincronizacao {
  status: 'sucesso' | 'revisao' | 'erro';
  quando?: string; // ISO-8601 do novo timestamp oficial (ausente quando `erro`)
  fonte?: string;
}

/** RN009/FR-013: rejeita edição de campos oficiais da Receita na borda. */
export class CampoNaoEditavel extends Error {
  constructor(campo: string) {
    super(`Field "${campo}" is official Receita data (read-only). Editable: ${CAMPOS_EDITAVEIS.join(', ')}.`);
    this.name = 'CampoNaoEditavel';
  }
}

export class GerirConta {
  constructor(
    private readonly fornecedores: FornecedorRepository,
    private readonly receita: ReceitaGateway,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  /** FR-013: edição restrita. */
  async editarPerfil(fornecedorId: string, patch: Record<string, unknown>, actor: { userId: string }): Promise<void> {
    const f = await this.fornecedores.porId(fornecedorId);
    if (!f) throw new Error('Supplier not found');
    for (const campo of Object.keys(patch)) {
      if (!CAMPOS_EDITAVEIS.includes(campo as (typeof CAMPOS_EDITAVEIS)[number])) throw new CampoNaoEditavel(campo);
    }
    f.editarContato(patch as ContatoEditavel);
    await this.fornecedores.salvar(f);
    await this.bus.publish(new PerfilEditado(fornecedorId, { campos: Object.keys(patch) }, { userId: actor.userId, empresaId: fornecedorId })
      .toEnvelope(randomUUID(), this.now()));
  }

  /**
   * RF018 / UC018: re-sincronização sob demanda. Grava `{timestamp, fonte, status}` (Story 1.6):
   * - `sucesso` — dados oficiais e novo timestamp aplicados;
   * - `revisao` — CNPJ deixou de ser ativo (baixado/inapto/suspenso): dados atualizados e a CPL é
   *   sinalizada para revisão (UC018 exceção);
   * - `erro` — Receita indisponível (A1): dados anteriores preservados, sem sobrescrever.
   * O `timestamp`/`fonte` retornados alimentam a "última sincronização" da tela "Minha conta".
   */
  async reSincronizar(fornecedorId: string, actor: { userId: string }): Promise<ResultadoSincronizacao> {
    const f = await this.fornecedores.porId(fornecedorId);
    if (!f) throw new Error('Supplier not found');
    const r = await this.receita.consultarCnpj(f.cnpj.valor);
    if (r.frescor !== 'verificado' || !r.valor) {
      await this.emit(fornecedorId, actor, 'erro', []);
      return { status: 'erro' }; // A1: dados atuais preservados, sem sobrescrever
    }
    f.aplicarSincronizacao(
      { razaoSocial: r.valor.razaoSocial, porte: r.valor.porte, cnaes: r.valor.cnaes.map((c) => ({ ...c, ativo: true })), situacao: r.valor.situacaoCadastral },
      r.timestamp,
    );
    await this.fornecedores.salvar(f);
    // Exceção UC018: situação oficial não-ativa → sinaliza revisão da CPL (evento auditável).
    const status = f.precisaRevisaoCpl() ? 'revisao' : 'sucesso';
    await this.emit(fornecedorId, actor, status, ['razaoSocial', 'porte', 'cnaes', 'situacao']);
    return { status, quando: r.timestamp, fonte: r.fonte };
  }

  private async emit(id: string, actor: { userId: string }, status: string, campos: string[]): Promise<void> {
    await this.bus.publish(new FornecedorSincronizado(id, { status, camposAtualizados: campos }, { userId: actor.userId, empresaId: id })
      .toEnvelope(randomUUID(), this.now()));
  }
}
