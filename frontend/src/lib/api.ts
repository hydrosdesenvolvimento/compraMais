/** Camada de acesso à API (usada pelo TanStack Query). Erros HTTP viram exceção → o Query trata. */
import { obterUsuario, obterToken } from './auth';

/**
 * Cabeçalhos comuns: identifica o ator autenticado (auditoria — `x-user-id`) e envia o JWT
 * (`Authorization: Bearer`) quando há sessão. Rotas que exigem token real (ex.: trocar senha, UC015)
 * validam o Bearer; as demais o ignoram (compatível com o modelo de ator por `x-user-id`).
 */
function headers(extra?: Record<string, string>): Record<string, string> | undefined {
  const h: Record<string, string> = { ...extra };
  const uid = obterUsuario()?.userId;
  if (uid) h['x-user-id'] = uid;
  const token = obterToken();
  if (token) h['authorization'] = `Bearer ${token}`;
  return Object.keys(h).length ? h : undefined;
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new HttpError(r.status, url);
  return (await r.json()) as T;
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: headers(body !== undefined ? { 'content-type': 'application/json' } : undefined),
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
/** UC018: resultado da re-sincronização — status + proveniência `{quando, fonte}` da consulta oficial. */
export interface SincronizacaoResultado { status: 'sucesso' | 'revisao' | 'erro'; quando?: string; fonte?: string }
export interface EnderecoView { logradouro: string; numero: string; complemento?: string; bairro: string; cidade: string; uf: string; cep: string }
export interface CnaeView { codigoSubclasse: string; tipo: 'principal' | 'secundario'; ativo: boolean }
/** UC019: vínculo de procurador exibido na tela "Procuradores" (ativos + rastro dos removidos, RN015). */
export interface ProcuradorView {
  contaId: string;
  identificador: string;
  ativo: boolean;
  convidadoPor: string | null;
  desde: string;
}
/** UC018 passo 1: perfil do fornecedor exibido na "Minha conta" (dados oficiais read-only + contato). */
export interface FornecedorPerfil {
  id: string; cnpj: string; razaoSocial: string; porte: string;
  situacao: 'ativa' | 'baixada' | 'inapta' | 'suspensa';
  origem: 'oficial' | 'manual';
  status: string; sincronizadoEm: string | null;
  nomeFantasia?: string; telefone?: string; endereco?: EnderecoView; cnaes: CnaeView[];
}

export const api = {
  // Portal do fornecedor
  fornecedor: (fid: string) => get<FornecedorPerfil>(`/fornecedores/${fid}`),
  editaisCompativeis: () => get<EditalItem[]>('/editais'),
  transparencia: () => get<Transparencia>('/transparencia'),
  documentos: (fid: string) => get<DocItem[]>(`/fornecedores/${fid}/documentos`),
  pendencias: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias`),
  pendenciasConsolidadas: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias-consolidadas`),
  sincronizar: (fid: string) => send<SincronizacaoResultado>(`/fornecedores/${fid}/sincronizar`, 'POST'),
  // RN009/FR-013: só Nome Fantasia, Endereço e Telefone. O backend rejeita campos oficiais (422) e devolve 204.
  editarPerfil: (fid: string, patch: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoView }) => send<void>(`/fornecedores/${fid}`, 'PATCH', patch),
  solicitarDireito: (tipo: string) => send('/titular/solicitacoes', 'POST', { tipo }),
  // UC015 · A2 — troca da própria senha (autenticada via Bearer). 400 = senha atual incorreta; 422 = senha fraca.
  trocarSenha: (senhaAtual: string, novaSenha: string) => send<void>('/auth/senha', 'POST', { senhaAtual, novaSenha }),
  // UC019 — Gerir procuradores (só o titular; 403 quando o ator não é o titular).
  procuradores: (fid: string) => get<ProcuradorView[]>(`/fornecedores/${fid}/procuradores`),
  convidarProcurador: (fid: string, identificador: string) => send<{ procuradorContaId: string }>(`/fornecedores/${fid}/procuradores`, 'POST', { identificador }),
  removerProcurador: (fid: string, contaId: string) => send<void>(`/fornecedores/${fid}/procuradores/${contaId}`, 'DELETE'),
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
