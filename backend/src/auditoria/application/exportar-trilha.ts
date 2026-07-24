import type { AuditQuery } from '../infra/audit-repository.js';
import { ConsultarTrilha, type AuditRecordView } from './consultar-trilha.js';

export type FormatoExport = 'csv' | 'json';
export interface ResultadoExport {
  conteudo: string;
  mime: string;
  nome: string;
  total: number;
  volumeSinalizado: boolean; // FR-011: acima do teto configurável
}

const COLUNAS = ['id', 'usuario', 'usuarioNome', 'papel', 'evento', 'timestamp', 'ip', 'payload'] as const;

/**
 * Exportação fiel do conjunto filtrado (FR-005/006/007). SOMENTE LEITURA — reusa ConsultarTrilha para
 * garantir o mesmo critério da consulta. Acima do teto configurável sinaliza o volume mas conclui (FR-011).
 */
export class ExportarTrilha {
  constructor(
    private readonly consultar: ConsultarTrilha,
    private readonly tetoSinalizacao = 50_000, // FR-011 — parâmetro configurável (AUDIT_EXPORT_SOFT_CAP)
  ) {}

  async exportar(probe: AuditQuery, formato: FormatoExport): Promise<ResultadoExport> {
    const registros = await this.consultar.consultar(probe); // sem paginação: conjunto completo do filtro (FR-007)
    const conteudo = formato === 'csv' ? toCsv(registros) : toJson(registros);
    const ext = formato === 'csv' ? 'csv' : 'json';
    return {
      conteudo,
      mime: formato === 'csv' ? 'text/csv' : 'application/json',
      nome: `auditoria-${new Date().toISOString().slice(0, 10)}.${ext}`,
      total: registros.length,
      volumeSinalizado: registros.length > this.tetoSinalizacao,
    };
  }
}

function toJson(registros: AuditRecordView[]): string {
  return JSON.stringify(registros.map((r) => ({ id: r.id, usuario: r.usuario, usuarioNome: r.usuarioNome, papel: r.papel, evento: r.evento, timestamp: r.timestamp, ip: r.ip, payload: r.payload })));
}

function toCsv(registros: AuditRecordView[]): string {
  const linhas = [COLUNAS.join(',')]; // cabeçalho (FR-005)
  for (const r of registros) {
    linhas.push([
      campo(r.id), campo(r.usuario), campo(r.usuarioNome), campo(r.papel), campo(r.evento), campo(r.timestamp), campo(r.ip), campo(JSON.stringify(r.payload)),
    ].join(','));
  }
  return linhas.join('\n');
}

/** Escapa um campo CSV (RFC 4180): aspas, vírgulas e quebras de linha. */
function campo(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
