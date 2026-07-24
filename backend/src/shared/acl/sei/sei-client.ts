// Portado de ../api_sei (sei-sdk) `core/client.ts` + `node/index.ts`. Cliente da camada web do SEI:
// login SSO (server-side), pesquisar/criar processo, listar processos e documentos.
import { SeiError } from './sei-errors.js';
import {
  findIdProtocoloInResults, parseArvoreFrameUrl, parseDocumentosFromArvore, parseFormFields,
  parseLinksByAcao, parseLoginForm, parseProcessosDaHome, parsePesquisaForm, resolveOrgaoValue,
  type DocumentoRef,
} from './sei-parse.js';
import type { Transport, TransportResponse } from './sei-transport.js';
import { NodeTransport } from './sei-transport.js';
import { absolutize, deriveSiglaOrgaoSistema, getParam, loginUrl } from './sei-urls.js';

export type NivelAcesso = 'publico' | 'restrito' | 'sigiloso';
const NIVEL_ACESSO: Record<NivelAcesso, string> = { publico: '0', restrito: '1', sigiloso: '2' };

export interface SeiContext { baseUrl: string; infraSistema: string; infraUnidadeAtual: string }
export interface Processo { idProtocolo: string; numero: string; url: string; arvoreUrl?: string; documentos?: DocumentoRef[] }
export interface ResumoProcesso { idProtocolo: string; numero: string; url: string }
export interface CriarProcessoOpts { idTipoProcedimento: string; especificacao?: string; nivelAcesso?: NivelAcesso; observacoes?: string }

/**
 * Client do SEI. Não conhece login nem cookies — recebe um `Transport` pronto e o HTML+URL de uma página
 * já renderizada (procedimento_controlar), de onde extrai os `infra_hash` válidos. Links do SEI são
 * RELATIVOS e resolvidos contra a URL da página atual (por isso rastreamos `currentUrl`).
 */
export class SeiClient {
  private lastHtml: string;
  private currentUrl: string;

  constructor(private readonly transport: Transport, private readonly ctx: SeiContext, initialHtml = '', initialUrl = '') {
    this.lastHtml = initialHtml;
    this.currentUrl = initialUrl || ctx.baseUrl;
  }

  get context(): SeiContext { return this.ctx; }
  setCurrentPage(html: string, url?: string): void { this.lastHtml = html; if (url) this.currentUrl = url; }

  /** Lista os processos da unidade a partir da página atual (home procedimento_controlar). */
  listarProcessos(): ResumoProcesso[] { return parseProcessosDaHome(this.lastHtml, this.currentUrl); }

  private async navegar(url: string): Promise<{ html: string; url: string }> {
    const res = await this.transport.request({ method: 'GET', url });
    assertOk(res); this.lastHtml = res.body; this.currentUrl = res.finalUrl;
    return { html: res.body, url: res.finalUrl };
  }

  private async enviar(url: string, campos: Record<string, string>): Promise<{ html: string; url: string }> {
    const res = await this.transport.request({ method: 'POST', url, body: new URLSearchParams(campos).toString() });
    assertOk(res); this.lastHtml = res.body; this.currentUrl = res.finalUrl;
    return { html: res.body, url: res.finalUrl };
  }

  /** Pesquisa um processo pelo número (formulário de pesquisa rápida da página atual) e o abre. */
  async pesquisarProcesso(numero: string): Promise<Processo> {
    const form = parsePesquisaForm(this.lastHtml, this.currentUrl);
    if (!form) {
      throw new SeiError('parse_error', 'Formulário de pesquisa rápida não encontrado na página atual (inicialize com o HTML da home).');
    }
    const res = await this.transport.request({ method: 'POST', url: form.action, body: new URLSearchParams({ [form.field]: numero }).toString() });
    assertOk(res); this.lastHtml = res.body; this.currentUrl = res.finalUrl;

    const idProtocolo = getParam(res.finalUrl, 'id_protocolo') ?? findIdProtocoloInResults(res.body, this.currentUrl);
    if (!idProtocolo) throw new SeiError('not_found', `Processo não encontrado: ${numero}`, { finalUrl: res.finalUrl });

    if (getParam(res.finalUrl, 'acao') === 'procedimento_trabalhar') {
      return this.buildProcesso(idProtocolo, numero, res.finalUrl, res.body);
    }
    return this.abrirProcesso(idProtocolo, numero);
  }

  /**
   * Cria um novo processo: 1) "Iniciar Processo" → 2) POST do tipo → 3) POST do form de geração.
   * ⚠️ LIMITAÇÃO (SEI real): a seleção de tipo é STATEFUL (autocomplete AJAX assina hdnInfraItens); este
   * caminho server-side funciona com fixtures/tipo já selecionável — contra o SEI real pode exigir o
   * fluxo pelo NAVEGADOR. É operação de ESCRITA.
   */
  async criarProcesso(opts: CriarProcessoOpts): Promise<Processo> {
    const escolherLink = parseLinksByAcao(this.lastHtml, this.currentUrl, 'procedimento_escolher_tipo')[0];
    if (!escolherLink) throw new SeiError('parse_error', 'Link "Iniciar Processo" não encontrado na página atual.');

    const et = await this.navegar(escolherLink.url);
    const escolher = parseFormFields(et.html, 'frmProcedimentoEscolherTipo');
    const escolherAction = escolher.action && absolutize(this.currentUrl, escolher.action);
    if (!escolherAction) throw new SeiError('parse_error', 'Formulário de escolha de tipo não encontrado.');

    const ger = await this.enviar(escolherAction, { ...escolher.hidden, hdnFiltroTipoProcedimento: '', hdnIdTipoProcedimento: opts.idTipoProcedimento });
    const gerar = parseFormFields(ger.html, 'frmProcedimentoCadastro');
    const gerarAction = gerar.action && absolutize(this.currentUrl, gerar.action);
    if (!gerarAction) throw new SeiError('parse_error', `Formulário de geração não encontrado (tipo '${opts.idTipoProcedimento}' inválido?).`);

    const res = await this.enviar(gerarAction, {
      ...gerar.hidden,
      hdnIdTipoProcedimento: opts.idTipoProcedimento,
      txtDescricao: opts.especificacao ?? '',
      rdoNivelAcesso: NIVEL_ACESSO[opts.nivelAcesso ?? 'publico'],
      ...(opts.observacoes ? { txaObservacoes: opts.observacoes } : {}),
    });

    const idProtocolo = getParam(res.url, 'id_protocolo') ?? getParam(res.url, 'id_procedimento');
    if (!idProtocolo || getParam(res.url, 'acao') !== 'procedimento_trabalhar') {
      throw new SeiError('http_error', 'Criação não confirmada (sem redirect para o processo).', { finalUrl: res.url });
    }
    return this.buildProcesso(idProtocolo, '', res.url, res.html);
  }

  /** Abre um processo pelo id interno, seguindo o link renderizado (com hash). */
  async abrirProcesso(idProtocolo: string, numero = ''): Promise<Processo> {
    const link = parseLinksByAcao(this.lastHtml, this.currentUrl, 'procedimento_trabalhar').find((l) => getParam(l.url, 'id_protocolo') === idProtocolo);
    if (!link) throw new SeiError('not_found', `Link procedimento_trabalhar (id_protocolo=${idProtocolo}) não encontrado.`);
    const res = await this.transport.request({ method: 'GET', url: link.url });
    assertOk(res); this.lastHtml = res.body; this.currentUrl = res.finalUrl;
    return this.buildProcesso(idProtocolo, numero, res.finalUrl, res.body);
  }

  /** Monta o Processo; os documentos vêm do frame da árvore (ifrArvore → procedimento_visualizar). */
  private async buildProcesso(idProtocolo: string, numero: string, url: string, html: string): Promise<Processo> {
    const arvoreUrl = parseArvoreFrameUrl(html, url);
    let documentos: DocumentoRef[] = [];
    if (arvoreUrl) {
      try { documentos = parseDocumentosFromArvore((await this.transport.request({ method: 'GET', url: arvoreUrl })).body); }
      catch { /* mantém vazio se a árvore não puder ser lida */ }
    }
    return { idProtocolo, numero, url, ...(arvoreUrl ? { arvoreUrl } : {}), documentos };
  }
}

function assertOk(res: TransportResponse): void {
  if (res.status >= 400) throw new SeiError('http_error', `SEI respondeu HTTP ${res.status}`, { finalUrl: res.finalUrl });
  if (res.finalUrl.includes('/sip/login.php')) throw new SeiError('session_expired', 'Sessão expirada: o SEI redirecionou para o login.');
}

export interface SeiCredentials { usuario: string; senha: string; selOrgao: string }
export interface NodeSeiClientConfig extends SeiCredentials {
  baseUrl: string;
  siglaSistema?: string;
  siglaOrgaoSistema?: string;
  transport?: Transport;
}

/**
 * Cria um SeiClient já autenticado (server-side): GET da tela de login → resolve selOrgao (texto→value)
 * → POST do login (segue SSO) → home procedimento_controlar. Portado de `node/index.ts`.
 */
export async function createNodeSeiClient(config: NodeSeiClientConfig): Promise<SeiClient> {
  const transport = config.transport ?? new NodeTransport();
  const siglaSistema = config.siglaSistema ?? 'SEI';
  const siglaOrgaoSistema = config.siglaOrgaoSistema ?? deriveSiglaOrgaoSistema(config.baseUrl) ?? '';

  const loginPageUrl = loginUrl(config.baseUrl, siglaOrgaoSistema, siglaSistema);
  const page = await transport.request({ method: 'GET', url: loginPageUrl });
  const form = parseLoginForm(page.body, page.finalUrl);

  const selOrgaoValue = resolveOrgaoValue(form.orgaos, config.selOrgao);
  if (!selOrgaoValue) {
    throw new SeiError('login_failed', `Órgão '${config.selOrgao}' não encontrado nas options de selOrgao. Disponíveis: ${form.orgaos.map((o) => o.text).join(', ') || '(nenhuma)'}`);
  }

  const postUrl = form.action ?? loginPageUrl;
  const body = new URLSearchParams({
    ...form.hidden,
    txtUsuario: config.usuario,
    pwdSenha: config.senha,
    selOrgao: selOrgaoValue,
    hdnAcao: '2', // submit exige '2' (efetuar login)
  }).toString();

  const res = await transport.request({ method: 'POST', url: postUrl, body });
  if (res.finalUrl.includes('/sip/login.php')) {
    throw new SeiError('login_failed', 'Login recusado pelo SIP (verifique usuário/senha/órgão).', { finalUrl: res.finalUrl });
  }

  const infraSistema = getParam(res.finalUrl, 'infra_sistema') ?? getParam(res.finalUrl, 'id_sistema') ?? '';
  const infraUnidadeAtual = getParam(res.finalUrl, 'infra_unidade_atual') ?? '';
  const ctx: SeiContext = { baseUrl: config.baseUrl, infraSistema, infraUnidadeAtual };
  return new SeiClient(transport, ctx, res.body, res.finalUrl);
}
