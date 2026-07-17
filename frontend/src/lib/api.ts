/** Camada de acesso à API (usada pelo TanStack Query). Erros HTTP viram exceção → o Query trata. */
import { obterUsuario, obterToken } from './auth';

/**
 * Cabeçalhos comuns: identifica o ator autenticado (auditoria — `x-user-id`), seu papel RBAC
 * (`x-papel`, exigido pelas rotas de gestão/admin) e a empresa representada (`x-empresa-id`, usada
 * pela vitrine/contestação para resolver o fornecedor). Envia também o JWT (`Authorization: Bearer`)
 * quando há sessão — rotas que exigem token real (ex.: trocar senha, UC015) validam o Bearer; as
 * demais o ignoram (compatível com o modelo de ator por header).
 */
function headers(extra?: Record<string, string>): Record<string, string> | undefined {
  const h: Record<string, string> = { ...extra };
  const u = obterUsuario();
  if (u?.userId) h['x-user-id'] = u.userId;
  if (u?.papel) h['x-papel'] = u.papel;
  if (u?.empresaId) h['x-empresa-id'] = u.empresaId;
  const token = obterToken();
  if (token) h['authorization'] = `Bearer ${token}`;
  return Object.keys(h).length ? h : undefined;
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw await HttpError.de(r, url);
  return (await r.json()) as T;
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: headers(body !== undefined ? { 'content-type': 'application/json' } : undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw await HttpError.de(r, url);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/**
 * Erro HTTP que preserva o corpo de erro padrão do backend (`{ codigo, mensagem }`). O `codigo` é um
 * identificador estável (mapeável a texto localizado — ver `lib/erros.ts`); a `mensagem` vem em inglês
 * (o backend não localiza) e serve de fallback. Sem esses campos, o front não tinha como dar feedback.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly codigo?: string,
    readonly mensagem?: string,
  ) {
    super(mensagem ?? `HTTP ${status} em ${url}`);
    this.name = 'HttpError';
  }

  /** Constrói a partir da Response, lendo o corpo `{ codigo, mensagem }` quando houver (JSON). */
  static async de(r: Response, url: string): Promise<HttpError> {
    let codigo: string | undefined;
    let mensagem: string | undefined;
    try {
      const corpo = (await r.json()) as { codigo?: unknown; mensagem?: unknown };
      if (typeof corpo?.codigo === 'string') codigo = corpo.codigo;
      if (typeof corpo?.mensagem === 'string') mensagem = corpo.mensagem;
    } catch { /* corpo vazio ou não-JSON: fica só o status */ }
    return new HttpError(r.status, url, codigo, mensagem);
  }
}

/**
 * Baixa um recurso como arquivo. Diferente de navegar via `window.location`, envia os cabeçalhos de
 * ator/RBAC (`x-papel`, `x-user-id`) — imprescindível em rotas protegidas como a exportação da trilha
 * (auditoria), que de outro modo responderia 403. Devolve o blob e o nome sugerido pelo servidor.
 */
export async function baixarArquivo(url: string): Promise<{ blob: Blob; nome: string }> {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw await HttpError.de(r, url);
  const disp = r.headers.get('content-disposition') ?? '';
  const m = /filename="?([^"]+?)"?(?:;|$)/.exec(disp);
  return { blob: await r.blob(), nome: m?.[1] ?? 'download' };
}

// --- Tipos de leitura ---
export interface EditalItem { id: string; objeto: string; secretariaId: string; prazoVigencia: string | null; quantitativos: number }
export interface EditalGestao { id: string; objeto: string; secretariaId: string; situacao: string }
export interface DocItem { id: string; tipo: string; situacao: 'vigente' | 'expirado'; status: 'pendente' | 'aprovado' | 'reprovado'; dataValidade: string | null }
/** Resumo de um credenciamento do fornecedor (home) — estado + objeto/secretaria do edital vinculado. */
export interface CredenciamentoResumoView {
  id: string; editalId: string; estado: 'iniciado' | 'aceito' | 'cancelado';
  numeroEdital: string | null; // ED-AAAA/NNN — null se o edital sumiu
  objeto: string | null; secretariaId: string | null;
  secretariaSigla: string | null; // sigla do catálogo; cai para o id quando não catalogada
  criadoEm: string; atualizadoEm: string; // ISO-8601
}
export interface DocPendente { id: string; tipo: string; status: 'pendente' | 'aprovado' | 'reprovado'; enviadoEm: string }
export interface Pendencia { tipo: string; motivo: string | null; proximoPasso: string; referenciaId?: string }
export interface Transparencia { editaisVigentes: number; secretarias: string[]; segmentos: string[] }
export interface Funil { documentosPendentes: number; editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number }; bloqueiosAtivos: number }
export interface ContestacaoView { id: string; cnae: string; justificativa: string; situacao: string; motivoResolucao: string | null }
export interface RegistroAuditoria { id: string; usuario: string | null; evento: string; timestamp: string; ip: string | null }
/** UC020 — item de catálogo base (superset: cada catálogo acrescenta seus campos). */
export type CatalogoSlug = 'secretarias' | 'setores-cnae' | 'tipos-documento';
export interface CatalogoItemView {
  id: string; ativo: boolean; situacao: 'ativo' | 'inativo';
  // Secretaria
  nome?: string; sigla?: string; responsavel?: string;
  // Setor/CNAE
  codigo?: string; descricao?: string;
  // Tipo de documento
  formato?: string; categoria?: string; exigeValidade?: boolean; exigeExercicio?: boolean;
}
/** UC021 — servidor interno exibido no Painel Admin de usuários (sem segredos). */
export interface UsuarioInternoView {
  id: string; nome: string; email: string; cargo: string | null; papel: string; ativo: boolean;
  registerDate: string; updateDate: string;
}
/** Telas do Painel Admin visíveis ao papel do próprio requisitante (GET /permissoes/telas/me). */
export interface TelasVisiveisView { papel: string; telas: string[] }
/** Uma linha da matriz de "telas por perfil": o papel, suas telas visíveis e se é editável/customizado. */
export interface LinhaMatrizTelas { papel: string; telasVisiveis: string[]; editavel: boolean; customizado: boolean }
/** Matriz completa (catálogo de telas + linha por papel) — GET /permissoes/telas (Administrador). */
export interface MatrizTelasView { telas: string[]; linhas: LinhaMatrizTelas[] }
/** UC021 — opção de cargo do seletor (rótulo → papel RBAC efetivo). */
export interface CargoOpcao { cargo: string; papel: string }
/** UC010 — peça do malote SEI (documento aprovado): ordem legal CNPJ→Pessoal→Anexos→Certidões (RN008). */
export type TipoPecaMalote = 'cnpj' | 'pessoal' | 'anexo' | 'certidao';
export interface PecaMalote { tipo: TipoPecaMalote; ref: string; tamanhoBytes: number }
/** UC010 — malote listado (QBE, FR-007). */
export interface MaloteListaView { id: string; fornecedorId: string; editalId: string; status: 'pendente' | 'gerado' | 'exportado'; fragmentos: number }
/** UC010 — detalhe do malote: status + contagem de peças/fragmentos + flag de peça indivisível acima do limite (FR-009). */
export interface MaloteDetalheView { id: string; status: 'pendente' | 'gerado' | 'exportado'; fragmentos: number; pecas: number; pecaAcimaLimite: boolean }
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
/** UC017 — solicitação de direito do titular (LGPD) exibida ao próprio titular e na fila do DPO. */
export type TipoDireito = 'acesso' | 'correcao' | 'exclusao';
export type CategoriaDado = 'cadastral' | 'fiscal' | 'contratual';
export interface SolicitacaoTitularView {
  id: string; titularId: string; tipo: TipoDireito; detalhe: string | null;
  categoria: CategoriaDado | null; status: 'pendente' | 'atendida' | 'recusada'; resultado: string | null;
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
  // Credenciamentos do fornecedor. Sem `incluirCancelados` o backend devolve só os "em andamento"
  // (recorte da home); a tela "Meus Credenciamentos" pede o histórico completo para o filtro de cancelados.
  meusCredenciamentos: (fid: string, incluirCancelados = false) =>
    get<CredenciamentoResumoView[]>(`/fornecedores/${fid}/credenciamentos${incluirCancelados ? '?incluirCancelados=true' : ''}`),
  pendencias: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias`),
  pendenciasConsolidadas: (fid: string) => get<Pendencia[]>(`/fornecedores/${fid}/pendencias-consolidadas`),
  // UC016 (tela única) — ações delegadas aos módulos donos:
  // recurso de reprovação → reenvia o documento reprovado (volta a `pendente`, notifica a CPL — UC006).
  reenviarDocumento: (docId: string) => send<{ status: string }>(`/documentos/${docId}/reenviar`, 'POST'),
  // regularização fiscal → reconsulta a elegibilidade na porta (libera se o débito sumiu — UC002).
  reconsultarElegibilidade: (fid: string, cnpj: string) => send<{ estado: string; podeAvancar: boolean }>(`/fornecedores/${fid}/reconsultar`, 'POST', { cnpj }),
  sincronizar: (fid: string) => send<SincronizacaoResultado>(`/fornecedores/${fid}/sincronizar`, 'POST'),
  // RN009/FR-013: só Nome Fantasia, Endereço e Telefone. O backend rejeita campos oficiais (422) e devolve 204.
  editarPerfil: (fid: string, patch: { nomeFantasia?: string; telefone?: string; endereco?: EnderecoView }) => send<void>(`/fornecedores/${fid}`, 'PATCH', patch),
  // UC017 — direitos do titular (LGPD). Só o PRÓPRIO titular exerce (§V); o backend bloqueia procurador (403).
  solicitarDireito: (tipo: TipoDireito, detalhe?: string, categoria?: CategoriaDado) =>
    send<{ solicitacaoId: string; status: string }>('/titular/solicitacoes', 'POST', { tipo, detalhe, categoria }),
  // Self-service: o titular lista os SEUS pedidos (backend exige titularId === ator para não-DPO).
  minhasSolicitacoes: (titularId: string) => get<SolicitacaoTitularView[]>(`/titular/solicitacoes?titularId=${encodeURIComponent(titularId)}`),
  // UC015 · A2 — troca da própria senha (autenticada via Bearer). 400 = senha atual incorreta; 422 = senha fraca.
  trocarSenha: (senhaAtual: string, novaSenha: string) => send<void>('/auth/senha', 'POST', { senhaAtual, novaSenha }),
  // UC019 — Gerir procuradores (só o titular; 403 quando o ator não é o titular).
  procuradores: (fid: string) => get<ProcuradorView[]>(`/fornecedores/${fid}/procuradores`),
  convidarProcurador: (fid: string, identificador: string) => send<{ procuradorContaId: string }>(`/fornecedores/${fid}/procuradores`, 'POST', { identificador }),
  removerProcurador: (fid: string, contaId: string) => send<void>(`/fornecedores/${fid}/procuradores/${contaId}`, 'DELETE'),
  contestarCnae: (editalId: string, body: { cnaeContestado: string; justificativa: string }) => send(`/editais/${editalId}/contestacoes-cnae`, 'POST', body),
  // UC004 — Solicitar credenciamento (capacidade = teto, RN005) e concluir por Termo de Aceite (RN016).
  iniciarCredenciamento: (editalId: string, capacidade: number) => send<{ credenciamentoId: string; estado: string }>(`/editais/${editalId}/credenciamentos`, 'POST', { capacidade }),
  aceitarTermo: (credId: string, body: { versaoTermo: string; finalidade: string }) => send<{ estado: string; status: string }>(`/credenciamentos/${credId}/termo`, 'POST', body),
  cancelarCredenciamento: (credId: string) => send<{ estado: string }>(`/credenciamentos/${credId}/cancelar`, 'POST'),

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
  // UC012: exportação da trilha via fetch (carrega x-papel — a rota é protegida por RBAC).
  auditoriaExportar: (params: URLSearchParams) => baixarArquivo(`/auditoria/exportar?${params.toString()}`),

  // UC017 — Atendimento LGPD pelo Encarregado (DPO) / Administrador. CPL não atende (RNF007 → 403 no backend).
  solicitacoesLgpd: (status?: 'pendente' | 'atendida' | 'recusada') =>
    get<SolicitacaoTitularView[]>(`/titular/solicitacoes${status ? `?status=${status}` : ''}`),
  atenderSolicitacao: (id: string, resultado: string) => send<{ status: string }>(`/titular/solicitacoes/${id}/atender`, 'POST', { resultado }),
  recusarSolicitacao: (id: string, motivo: string) => send<{ status: string }>(`/titular/solicitacoes/${id}/recusar`, 'POST', { motivo }),
  // Exclusão: descarte só após a retenção legal da categoria (FR-008); 409 se ainda retido.
  descartarSolicitacao: (id: string, dataRegistro: string) => send<{ descartado: boolean }>(`/titular/solicitacoes/${id}/descartar`, 'POST', { dataRegistro }),

  // UC010 — Malote SEI (CPL/Administrador). Geração assíncrona (202), QBE, exportação idempotente.
  malotesListar: (params: URLSearchParams) => get<MaloteListaView[]>(`/malotes?${params.toString()}`),
  maloteDetalhe: (id: string) => get<MaloteDetalheView>(`/malotes/${id}`),
  maloteGerar: (body: { fornecedorId: string; editalId: string; pecas: PecaMalote[] }) => send<{ maloteId: string; status: string }>('/malotes', 'POST', body),
  maloteExportar: (id: string) => send<{ status: string; jaExportado: boolean }>(`/malotes/${id}/exportar`, 'POST'),

  // UC020 — Catálogos base (Administrador). Leitura aberta; escritas exigem x-papel administrador.
  catalogoListar: (slug: CatalogoSlug, incluirInativos = false) =>
    get<CatalogoItemView[]>(`/catalogos/${slug}${incluirInativos ? '?incluirInativos=true' : ''}`),
  catalogoCriar: (slug: CatalogoSlug, body: Record<string, unknown>) => send<{ id: string }>(`/catalogos/${slug}`, 'POST', body),
  catalogoEditar: (slug: CatalogoSlug, id: string, body: Record<string, unknown>) => send<{ ok: boolean }>(`/catalogos/${slug}/${id}`, 'PATCH', body),
  catalogoInativar: (slug: CatalogoSlug, id: string) => send<{ situacao: string }>(`/catalogos/${slug}/${id}/inativar`, 'POST'),
  catalogoReativar: (slug: CatalogoSlug, id: string) => send<{ situacao: string }>(`/catalogos/${slug}/${id}/reativar`, 'POST'),

  // UC021 — Gestão de usuários internos/servidores (Administrador). Todas exigem x-papel administrador.
  cargos: () => get<CargoOpcao[]>('/admin/cargos'),
  usuariosListar: (incluirInativos = false) =>
    get<UsuarioInternoView[]>(`/admin/usuarios${incluirInativos ? '?incluirInativos=true' : ''}`),
  usuarioCriar: (body: { nome: string; email: string; cargo: string; senha: string }) => send<{ usuarioId: string }>('/admin/usuarios', 'POST', body),
  usuarioEditar: (id: string, body: { nome?: string; cargo?: string }) => send<{ ok: boolean }>(`/admin/usuarios/${id}`, 'PATCH', body),
  usuarioResetarSenha: (id: string, novaSenha: string) => send<{ ok: boolean }>(`/admin/usuarios/${id}/resetar-senha`, 'POST', { novaSenha }),
  usuarioInativar: (id: string) => send<{ situacao: string }>(`/admin/usuarios/${id}/inativar`, 'POST'),
  usuarioReativar: (id: string) => send<{ situacao: string }>(`/admin/usuarios/${id}/reativar`, 'POST'),

  // Administração de telas por perfil (§15/AD-35): visibilidade do Painel Admin por papel.
  // `/me` alimenta o menu e as guardas de rota (aberto à sessão); a matriz e o PUT exigem administrador.
  telasVisiveis: () => get<TelasVisiveisView>('/permissoes/telas/me'),
  matrizTelas: () => get<MatrizTelasView>('/permissoes/telas'),
  salvarTelasPapel: (papel: string, telas: string[]) =>
    send<{ papel: string; telas: string[] }>(`/permissoes/telas/${encodeURIComponent(papel)}`, 'PUT', { telas }),
};
