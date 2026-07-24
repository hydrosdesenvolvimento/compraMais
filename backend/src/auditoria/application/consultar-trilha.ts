import type { AuditRecord } from '../domain/audit-record.js';
import type { AuditQuery, AuditPage, AuditRepository } from '../infra/audit-repository.js';
import type { Papel } from '../../shared/identity/identity-provider.js';
import type { AtorInfo, ResolvedorAtores } from './resolvedor-atores.js';

export class IntervaloInvalido extends Error {
  constructor() { super('Invalid date range: "de" cannot be greater than "ate".'); this.name = 'IntervaloInvalido'; }
}

/**
 * Registro da trilha enriquecido para exibição/exportação: além do `usuario` (UUID imutável do ator),
 * inclui `usuarioNome` e `papel` resolvidos em tempo de leitura. Ausentes → `null` (sem resolvedor ou
 * usuário não encontrado). O registro persistido não muda (AD-18).
 */
export interface AuditRecordView {
  readonly id: string;
  readonly usuario: string | null;
  readonly usuarioNome: string | null;
  readonly papel: Papel | null;
  readonly evento: string;
  readonly timestamp: string;
  readonly ip: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Consulta da trilha por instância parcial (QBE — FR-001/002). SOMENTE LEITURA (FR-003): nunca escreve.
 * Valida intervalo (FR-010); a ordenação determinística (FR-004) é garantida pelo repositório. Enriquece
 * cada registro com nome/papel do ator (resolvedor opcional) sem alterar o registro imutável.
 */
export class ConsultarTrilha {
  constructor(
    private readonly repo: AuditRepository,
    private readonly atores?: ResolvedorAtores,
  ) {}

  async consultar(probe: AuditQuery, page?: AuditPage): Promise<AuditRecordView[]> {
    if (probe.de && probe.ate && probe.de > probe.ate) throw new IntervaloInvalido();
    const registros = await this.repo.query(probe, page);
    return this.enriquecer(registros);
  }

  private async enriquecer(registros: AuditRecord[]): Promise<AuditRecordView[]> {
    const ids = [...new Set(registros.map((r) => r.usuario).filter((u): u is string => u !== null))];
    const mapa = this.atores && ids.length ? await this.atores.resolver(ids) : new Map<string, AtorInfo>();
    return registros.map((r) => {
      const info = r.usuario ? mapa.get(r.usuario) : undefined;
      return {
        id: r.id,
        usuario: r.usuario,
        usuarioNome: info?.nome ?? null,
        papel: info?.papel ?? null,
        evento: r.evento,
        timestamp: r.timestamp,
        ip: r.ip,
        payload: r.payload,
      };
    });
  }
}
