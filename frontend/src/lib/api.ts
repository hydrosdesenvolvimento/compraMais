/** Camada de acesso à API (usada pelo TanStack Query). Erros HTTP viram exceção → o Query trata. */

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new HttpError(r.status, url);
  return (await r.json()) as T;
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new HttpError(r.status, url);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

export class HttpError extends Error {
  constructor(readonly status: number, url: string) { super(`HTTP ${status} em ${url}`); this.name = 'HttpError'; }
}

// --- Tipos de leitura ---
export interface EditalItem { id: string; objeto: string }
export interface EditalGestao { id: string; objeto: string; secretariaId: string; situacao: string }
export interface DocItem { id: string; tipo: string; situacao: 'vigente' | 'expirado' }
export interface DocPendente { id: string; tipo: string }
export interface Pendencia { tipo: string; motivo: string | null; proximoPasso: string; referenciaId?: string }
export interface Transparencia { editaisVigentes: number; secretarias: string[]; segmentos: string[] }
export interface Funil { documentosPendentes: number; editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number }; bloqueiosAtivos: number }
export interface ContestacaoView { id: string; cnae: string; justificativa: string; situacao: string; motivoResolucao: string | null }
export interface RegistroAuditoria { id: string; usuario: string | null; evento: string; timestamp: string; ip: string | null }

export const api = {
  // Portal do fornecedor
  editaisCompativeis: () => get<EditalItem[]>('/editais'),
  transparencia: () => get<Transparencia>('/transparencia'),
  documentos: (fid: string) => get<DocItem[]>(`/fornecedores/${fid}/documentos`),
  pendencias: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias`),
  pendenciasConsolidadas: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias-consolidadas`),
  sincronizar: (fid: string) => send<{ quando?: string }>(`/fornecedores/${fid}/sincronizar`, 'POST'),
  solicitarDireito: (tipo: string) => send('/titular/solicitacoes', 'POST', { tipo }),
  contestarCnae: (editalId: string, body: { cnaeContestado: string; justificativa: string }) => send(`/editais/${editalId}/contestacoes-cnae`, 'POST', body),

  // Painel admin
  dashboardAdmin: () => get<Funil>('/admin/dashboard'),
  gestaoEditais: (secretariaId: string, situacao: string) => get<EditalGestao[]>(`/gestao/editais?secretariaId=${encodeURIComponent(secretariaId)}&situacao=${encodeURIComponent(situacao)}`),
  criarEdital: (body: unknown) => send('/editais', 'POST', body),
  publicarEdital: (id: string) => send(`/editais/${id}/publicar`, 'POST'),
  encerrarEdital: (id: string) => send(`/editais/${id}/encerrar`, 'POST'),
  docsPendentes: (fid: string, params: URLSearchParams) => get<DocPendente[]>(`/fornecedores/${fid}/documentos/pendentes?${params.toString()}`),
  covalidar: (docId: string, body: unknown) => send(`/documentos/${docId}/covalidar`, 'POST', body),
  contestacoesDoEdital: (editalId: string) => get<ContestacaoView[]>(`/editais/${editalId}/contestacoes-cnae`),
  acatarContestacao: (id: string, novoCnaes: string[]) => send(`/contestacoes-cnae/${id}/acatar`, 'POST', { novoCnaes }),
  recusarContestacao: (id: string, motivo: string) => send(`/contestacoes-cnae/${id}/recusar`, 'POST', { motivo }),
  auditoria: (params: URLSearchParams) => get<RegistroAuditoria[]>(`/auditoria?${params.toString()}`),
};
