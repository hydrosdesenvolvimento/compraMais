// Parsers da camada web do SEI. Portados de ../api_sei (sei-sdk) `core/parse.ts`, reescritos em REGEX
// (o compraMais não adiciona `node-html-parser`). Os seletores seguem a estrutura padrão do SEI e devem
// ser confirmados contra os HTMLs reais da instância do órgão (gate de QA).
import { absolutize, getParam } from './sei-urls.js';

const NUMERO_PROCESSO = /^\d{4}\.\d{6}\.\d{5}\/\d{4}-\d{2}$/;

/** Remove tags e normaliza espaços de um trecho de HTML (texto interno de um link/option). */
function texto(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export interface LinkAcao {
  acao: string;
  url: string; // absoluta, inclui infra_hash quando presente
  infraHash: string | null;
  texto?: string;
  params: Record<string, string>;
}

function toLinkAcao(absUrl: string, txt?: string): LinkAcao {
  const params: Record<string, string> = {};
  try { new URL(absUrl).searchParams.forEach((v, k) => { params[k] = v; }); } catch { /* ignore */ }
  return {
    acao: params['acao'] ?? '',
    url: absUrl,
    infraHash: getParam(absUrl, 'infra_hash'),
    ...(txt ? { texto: txt } : {}),
    params,
  };
}

/** Extrai todos os links de controlador.php que apontam para uma dada ação. */
export function parseLinksByAcao(html: string, baseUrl: string, acao: string): LinkAcao[] {
  const out: LinkAcao[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1] ?? '';
    if (!href.includes('controlador.php')) continue;
    const abs = absolutize(baseUrl, href.replace(/&amp;/g, '&'));
    if (!abs || getParam(abs, 'acao') !== acao) continue;
    out.push(toLinkAcao(abs, texto(m[2] ?? '') || undefined));
  }
  return out;
}

export function findFirstLinkByAcao(html: string, baseUrl: string, acao: string): LinkAcao | null {
  return parseLinksByAcao(html, baseUrl, acao)[0] ?? null;
}

/**
 * Lista os processos da unidade a partir da página de controle (procedimento_controlar): cada linha tem
 * um link `procedimento_trabalhar` cujo texto é o número do processo. Dedup por id.
 */
export function parseProcessosDaHome(html: string, pageUrl: string): Array<{ idProtocolo: string; numero: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ idProtocolo: string; numero: string; url: string }> = [];
  for (const l of parseLinksByAcao(html, pageUrl, 'procedimento_trabalhar')) {
    const id = getParam(l.url, 'id_procedimento') ?? getParam(l.url, 'id_protocolo');
    const numero = (l.texto ?? '').trim();
    if (!id || seen.has(id) || !NUMERO_PROCESSO.test(numero)) continue;
    seen.add(id);
    out.push({ idProtocolo: id, numero, url: l.url });
  }
  return out;
}

export interface FormFields { action: string | null; hidden: Record<string, string> }

/** Extrai action + inputs hidden (da página inteira; o SEI tolera parâmetros extras no POST). */
export function parseFormFields(html: string, formId: string): FormFields {
  const fm = html.match(new RegExp(`<form[^>]*\\bid="${formId}"[^>]*>`, 'i'));
  const action = fm ? (/action\s*=\s*"([^"]*)"/i.exec(fm[0])?.[1] ?? null) : null;
  const hidden: Record<string, string> = {};
  for (const it of html.match(/<input[^>]*>/gi) ?? []) {
    if ((/type\s*=\s*"([^"]*)"/i.exec(it)?.[1] ?? '').toLowerCase() !== 'hidden') continue;
    const name = /name\s*=\s*"([^"]*)"/i.exec(it)?.[1];
    if (name) hidden[name] = /value\s*=\s*"([^"]*)"/i.exec(it)?.[1] ?? '';
  }
  return { action: action ? action.replace(/&amp;/g, '&') : null, hidden };
}

export interface PesquisaForm { action: string; field: string }

/**
 * Localiza o formulário de pesquisa rápida (campo `txtPesquisaRapida`) e devolve o action (com hash) + o
 * nome do campo — sem fabricar hash. Encontra o `<form>` que contém o campo e lê seu `action`.
 */
export function parsePesquisaForm(html: string, baseUrl: string): PesquisaForm | null {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  for (const form of forms) {
    if (!/name\s*=\s*"txtPesquisaRapida"|id\s*=\s*"txtPesquisaRapida"/i.test(form)) continue;
    const action = /<form\b[^>]*\baction\s*=\s*"([^"]*)"/i.exec(form)?.[1];
    if (!action) continue;
    const abs = absolutize(baseUrl, action.replace(/&amp;/g, '&'));
    if (!abs) continue;
    return { action: abs, field: 'txtPesquisaRapida' };
  }
  return null;
}

/** id_protocolo da página de resultados da pesquisa quando não há redirect direto ao processo. */
export function findIdProtocoloInResults(html: string, baseUrl: string): string | null {
  const link = findFirstLinkByAcao(html, baseUrl, 'procedimento_trabalhar');
  return link ? getParam(link.url, 'id_protocolo') : null;
}

/** URL do frame da árvore (`ifrArvore` → procedimento_visualizar) da página procedimento_trabalhar. */
export function parseArvoreFrameUrl(html: string, pageUrl: string): string | null {
  const iframe = html.match(/<iframe\b[^>]*\b(?:id\s*=\s*"ifrArvore"|name\s*=\s*"ifrArvore")[^>]*>/i)?.[0]
    ?? html.match(/<iframe\b[^>]*\bsrc\s*=\s*"[^"]*ifrArvore[^"]*"[^>]*>/i)?.[0];
  const src = iframe ? /src\s*=\s*"([^"]*)"/i.exec(iframe)?.[1] : undefined;
  return src ? absolutize(pageUrl, src.replace(/&amp;/g, '&')) : null;
}

function unescapeJs(s: string): string { return s.replace(/\\(["'\\/])/g, '$1'); }

export interface DocumentoRef { idDocumento: string; titulo?: string; pasta?: string }

/**
 * Documentos do array `Nos[]` da árvore (frame procedimento_visualizar):
 *   Nos[i] = new infraArvoreNo("DOCUMENTO","<id>","<pasta>","<href>","<target>","<rótulo>", ...)
 */
export function parseDocumentosFromArvore(html: string): DocumentoRef[] {
  const re = /new\s+infraArvoreNo\(\s*"DOCUMENTO"\s*,\s*"([^"]+)"\s*,\s*(?:null|"([^"]*)")\s*,\s*(?:null|"[^"]*")\s*,\s*(?:null|"[^"]*")\s*,\s*"((?:[^"\\]|\\.)*)"/g;
  const out: DocumentoRef[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const idDocumento = m[1] as string;
    const pasta = m[2];
    const titulo = unescapeJs(m[3] ?? '');
    out.push({ idDocumento, ...(titulo ? { titulo } : {}), ...(pasta ? { pasta } : {}) });
  }
  return out;
}

export interface OrgaoOption { value: string; text: string }
export interface LoginForm { action: string | null; hidden: Record<string, string>; orgaos: OrgaoOption[] }

/** Lê a tela de login do SIP: action, campos ocultos e as options do `<select name="selOrgao">`. */
export function parseLoginForm(html: string, baseUrl: string): LoginForm {
  const formBlock = html.match(/<form\b[^>]*\bid="frmLogin"[\s\S]*?<\/form>/i)?.[0]
    ?? html.match(/<form\b[\s\S]*?<\/form>/i)?.[0] ?? html;
  const actionAttr = /<form\b[^>]*\baction\s*=\s*"([^"]*)"/i.exec(formBlock)?.[1] ?? null;
  const action = actionAttr ? absolutize(baseUrl, actionAttr.replace(/&amp;/g, '&')) : null;

  const hidden: Record<string, string> = {};
  for (const it of formBlock.match(/<input[^>]*>/gi) ?? []) {
    if ((/type\s*=\s*"([^"]*)"/i.exec(it)?.[1] ?? '').toLowerCase() !== 'hidden') continue;
    const name = /name\s*=\s*"([^"]*)"/i.exec(it)?.[1];
    if (name) hidden[name] = /value\s*=\s*"([^"]*)"/i.exec(it)?.[1] ?? '';
  }

  const orgaos: OrgaoOption[] = [];
  const select = formBlock.match(/<select\b[^>]*\b(?:id\s*=\s*"selOrgao"|name\s*=\s*"selOrgao")[\s\S]*?<\/select>/i)?.[0];
  if (select) {
    const re = /<option\b[^>]*\bvalue\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(select)) !== null) {
      const value = m[1] ?? '';
      const text = texto(m[2] ?? '');
      if (value !== '') orgaos.push({ value, text });
    }
  }
  return { action, hidden, orgaos };
}

/** Resolve o value de selOrgao a partir do TEXTO (match exato case-insensitive; senão parcial). */
export function resolveOrgaoValue(orgaos: OrgaoOption[], txt: string): string | null {
  const alvo = txt.trim().toLowerCase();
  if (!alvo) return null;
  const exato = orgaos.find((o) => o.text.trim().toLowerCase() === alvo);
  if (exato) return exato.value;
  return orgaos.find((o) => o.text.trim().toLowerCase().includes(alvo))?.value ?? null;
}
