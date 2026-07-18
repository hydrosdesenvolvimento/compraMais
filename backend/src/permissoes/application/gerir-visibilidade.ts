import { randomUUID } from 'node:crypto';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { DomainEventEnvelope } from '../../shared/events/domain-event.js';
import { VisibilidadeTelasAlterada } from '../domain/eventos.js';
import {
  TELAS_ADMIN, PAPEIS_CONFIGURAVEIS, ehTelaAdmin, ehPapelConfiguravel,
  telasPadraoDoPapel, telasObrigatorias, type TelaAdminKey, type PapelConfiguravel,
} from '../domain/tela-admin.js';
import type { VisibilidadeRepository } from './visibilidade-repository.js';

type Actor = { userId: string; empresaId?: string };

export class PapelNaoConfiguravel extends Error {
  constructor(papel: string) { super(`Role is not configurable: '${papel}'.`); this.name = 'PapelNaoConfiguravel'; }
}
export class TelaDesconhecida extends Error {
  constructor(key: string) { super(`Unknown admin screen: '${key}'.`); this.name = 'TelaDesconhecida'; }
}

/** Uma linha da matriz apresentada ao Administrador. `obrigatorias` são telas que a linha não pode
 *  desmarcar (anti-lockout — ex.: `perfis` do administrador). */
export interface LinhaMatriz {
  papel: PapelConfiguravel;
  telasVisiveis: TelaAdminKey[];
  editavel: boolean;
  customizado: boolean;
  obrigatorias: TelaAdminKey[];
}

export interface MatrizVisibilidade {
  telas: TelaAdminKey[];
  linhas: LinhaMatriz[];
}

/**
 * "Administração de telas por perfil": governa quais TELAS do Painel Admin cada PAPEL enxerga (§15/AD-35).
 * Todos os papéis internos (inclusive o `administrador`) são configuráveis; usam o override persistido, ou
 * o padrão do negócio quando nunca customizados. O `administrador` nunca perde `perfis` (anti-lockout). Toda
 * alteração vira fato na trilha (AD-18). A leitura por papel (`telasDoPapel`) alimenta o menu e as guardas.
 */
export class GerirVisibilidadeTelas {
  constructor(
    private readonly repo: VisibilidadeRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  /** Telas visíveis efetivas de um papel (override do repo, senão padrão; externo/desconhecido → nenhuma).
   *  Overrides sempre recebem as telas obrigatórias do papel (anti-lockout). */
  async telasDoPapel(papel: string): Promise<TelaAdminKey[]> {
    if (!ehPapelConfiguravel(papel)) return [];
    const override = await this.repo.porPapel(papel);
    return override ? this.comObrigatorias(papel, override.telasVisiveis) : telasPadraoDoPapel(papel);
  }

  /** Matriz completa para a tela de administração (todos os papéis configuráveis, inclusive administrador). */
  async matriz(): Promise<MatrizVisibilidade> {
    const overrides = new Map((await this.repo.carregar()).map((o) => [o.papel, o.telasVisiveis]));
    const linhas: LinhaMatriz[] = PAPEIS_CONFIGURAVEIS.map((papel): LinhaMatriz => {
      const custom = overrides.get(papel);
      return {
        papel,
        telasVisiveis: custom ? this.comObrigatorias(papel, custom) : telasPadraoDoPapel(papel),
        editavel: true,
        customizado: custom !== undefined,
        obrigatorias: [...telasObrigatorias(papel)],
      };
    });
    return { telas: [...TELAS_ADMIN], linhas };
  }

  /** Garante que as telas obrigatórias do papel estejam presentes, na ordem canônica do catálogo. */
  private comObrigatorias(papel: string, telas: readonly TelaAdminKey[]): TelaAdminKey[] {
    const obrig = telasObrigatorias(papel);
    if (!obrig.length) return [...telas];
    return TELAS_ADMIN.filter((k) => telas.includes(k) || obrig.includes(k));
  }

  /**
   * Redefine as telas visíveis de um papel configurável. Valida papel e keys; ordena de forma canônica
   * (ordem do catálogo), deduplica e reintroduz as obrigatórias; persiste e emite VisibilidadeTelasAlterada
   * com o diff (antes/depois).
   */
  async definir(papel: string, telasVisiveis: string[], actor: Actor): Promise<TelaAdminKey[]> {
    if (!ehPapelConfiguravel(papel)) throw new PapelNaoConfiguravel(papel);
    for (const t of telasVisiveis) if (!ehTelaAdmin(t)) throw new TelaDesconhecida(t);

    // Normaliza: ordem do catálogo + dedup + obrigatórias (anti-lockout).
    const desejadas = new Set<string>([...telasVisiveis, ...telasObrigatorias(papel)]);
    const alvo = TELAS_ADMIN.filter((k) => desejadas.has(k));
    const antes = await this.telasDoPapel(papel);
    const adicionadas = alvo.filter((k) => !antes.includes(k));
    const removidas = antes.filter((k) => !alvo.includes(k));

    await this.repo.salvar(papel, alvo, actor.userId);
    if (adicionadas.length || removidas.length) {
      await this.publicar(new VisibilidadeTelasAlterada(papel, { papel, telasVisiveis: alvo, adicionadas, removidas }, actor));
    }
    return alvo;
  }

  private publicar(ev: { toEnvelope(id: string, at: string): DomainEventEnvelope }): Promise<void> {
    return this.bus.publish(ev.toEnvelope(randomUUID(), this.now()));
  }
}
