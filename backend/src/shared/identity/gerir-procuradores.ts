import { randomUUID } from 'node:crypto';
import { ContaAcesso } from './conta-acesso.js';
import type { ContaRepository } from './conta-repository.js';
import type { EventBus } from '../events/event-bus.js';
import { ProcuradorConvidado, ProcuradorRemovido } from './eventos.js';

export class TitularNaoEncontrado extends Error {
  constructor() { super('Data subject not found for this company.'); this.name = 'TitularNaoEncontrado'; }
}

/** O ator existe mas não é o titular da empresa: gestão de procuradores é prerrogativa do titular (RN010). */
export class ApenasTitularGere extends Error {
  constructor() { super('Only the data subject can manage attorneys (RN010/AD-30).'); this.name = 'ApenasTitularGere'; }
}

export class ProcuradorNaoEncontrado extends Error {
  constructor() { super('Attorney not found for this company.'); this.name = 'ProcuradorNaoEncontrado'; }
}

/** Vínculo de procurador exibido na tela de gestão (UC019 passo 1). */
export interface ProcuradorView {
  contaId: string;
  identificador: string;
  /** Nome de exibição resolvido de `usuarios` pelo identificador; `null` quando o convidado não tem cadastro. */
  nome: string | null;
  ativo: boolean;
  convidadoPor: string | null;
  desde: string;
}

/**
 * Resolve o titular de login de um fornecedor (fonte: `usuarios`). Usado para PROVISIONAR sob demanda
 * a ContaAcesso(titular) de contas criadas antes desta UC — a ContaAcesso só passou a ser gravada com
 * `id = userId` no cadastro recente, então usuários antigos não teriam o vínculo. Retorna null quando
 * o userId não é o titular do fornecedor.
 */
export interface TitularDirectory {
  titularDeLogin(fornecedorId: string, userId: string): Promise<{ identificador: string } | null>;
}

/**
 * Resolve nomes de exibição de procuradores a partir do identificador (e-mail) — fonte: `usuarios`.
 * Procurador só convidado (ainda sem cadastro) não é retornado no mapa → a tela cai no identificador.
 * O mapa é chaveado pelo identificador normalizado (minúsculas/trim).
 */
export interface DiretorioNomes {
  nomesPorIdentificadores(identificadores: string[]): Promise<Map<string, string>>;
}

/**
 * Caso de uso: gestão de procuradores (UC019 / RN010, AD-30). Só o titular convida/lista/remove; cada
 * ação registra ator + empresa na trilha (AD-30). Um procurador que tente convidar/gerir é bloqueado
 * (ApenasTitularGere → 403). A remoção é lógica (append-only, RN015): a conta fica inativa, preservando o rastro.
 */
export class GerirProcuradores {
  constructor(
    private readonly contas: ContaRepository,
    private readonly bus: EventBus,
    private readonly titularDir?: TitularDirectory,
    private readonly nomesDir?: DiretorioNomes,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async convidar(fornecedorId: string, titularContaId: string, identificador: string): Promise<{ procuradorContaId: string }> {
    const titular = await this.exigirTitular(fornecedorId, titularContaId);

    const procurador = titular.convidarProcurador({ id: randomUUID(), identificador, porTitular: titular });
    await this.contas.salvar(procurador);

    await this.bus.publish(new ProcuradorConvidado(fornecedorId, { procuradorContaId: procurador.id, identificador },
      { userId: titular.id, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
    return { procuradorContaId: procurador.id };
  }

  /** UC019 passo 1: o titular abre "Procuradores" e vê os vínculos (ativos e o rastro dos removidos). */
  async listar(fornecedorId: string, titularContaId: string): Promise<ProcuradorView[]> {
    await this.exigirTitular(fornecedorId, titularContaId);
    const procuradores = (await this.contas.listarPorFornecedor(fornecedorId)).filter((c) => c.papel === 'procurador');
    // Resolve o nome de exibição em lote (evita N+1); ausentes ficam null e a tela cai no identificador.
    const nomes = this.nomesDir
      ? await this.nomesDir.nomesPorIdentificadores(procuradores.map((c) => c.identificador))
      : new Map<string, string>();
    return procuradores.map((c) => ({
      contaId: c.id,
      identificador: c.identificador,
      nome: nomes.get(c.identificador.trim().toLowerCase()) ?? null,
      ativo: c.ativo,
      convidadoPor: c.convidadoPor,
      desde: c.registerDate,
    }));
  }

  async remover(fornecedorId: string, titularContaId: string, procuradorContaId: string): Promise<void> {
    const titular = await this.exigirTitular(fornecedorId, titularContaId);
    const proc = await this.contas.porId(procuradorContaId);
    if (!proc || proc.fornecedorId !== fornecedorId || proc.papel !== 'procurador') throw new ProcuradorNaoEncontrado();
    proc.remover(titular.identificador);
    await this.contas.salvar(proc); // remoção lógica: conta inativa, rastro preservado (RN015)
    await this.bus.publish(new ProcuradorRemovido(fornecedorId, { procuradorContaId },
      { userId: titular.id, empresaId: fornecedorId }).toEnvelope(randomUUID(), this.now()));
  }

  /** Resolve e valida o titular: 404 quando não há conta/empresa; 403 quando o ator não é o titular (RN010). */
  private async exigirTitular(fornecedorId: string, titularContaId: string) {
    let conta = await this.contas.porId(titularContaId);
    // Provisiona a ContaAcesso(titular) sob demanda para contas de login criadas antes desta UC
    // (backfill idempotente): se o ator é o titular do fornecedor em `usuarios`, cria e persiste o vínculo.
    if (!conta && this.titularDir) {
      const t = await this.titularDir.titularDeLogin(fornecedorId, titularContaId);
      if (t) {
        conta = ContaAcesso.criarTitular({ id: titularContaId, fornecedorId, identificador: t.identificador });
        await this.contas.salvar(conta);
      }
    }
    if (!conta || conta.fornecedorId !== fornecedorId) throw new TitularNaoEncontrado();
    if (conta.papel !== 'titular') throw new ApenasTitularGere(); // procurador não convida outro procurador (UC019 exceção)
    return conta;
  }
}
