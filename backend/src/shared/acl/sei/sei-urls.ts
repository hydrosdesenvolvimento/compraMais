// Portado de ../api_sei (sei-sdk) `core/urls.ts`. Helpers de URL da camada web do SEI.

/** Origem sintética só para parsear URLs relativas quando não há base real. */
const SYNTHETIC_BASE = 'https://sei.invalid';

/** Monta a URL do formulário de login do SIP. */
export function loginUrl(baseUrl: string, orgao: string, sistema: string): string {
  const u = new URL('/sip/login.php', baseUrl);
  u.searchParams.set('sigla_orgao_sistema', orgao);
  u.searchParams.set('sigla_sistema', sistema);
  return u.toString();
}

/** Resolve um href (possivelmente relativo) contra uma base absoluta; null se inválido. */
export function absolutize(baseUrl: string, href: string): string | null {
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

/** Lê um parâmetro de query de uma URL absoluta ou relativa. */
export function getParam(url: string, name: string): string | null {
  try { return new URL(url, SYNTHETIC_BASE).searchParams.get(name); } catch { return null; }
}

/**
 * Deriva a sigla do órgão do sistema a partir do host (ex.: 'app.sei.ac.gov.br' → 'AC'). Usado só como
 * hint para o GET inicial da tela de login; o valor autoritativo vem do form. null fora do padrão.
 */
export function deriveSiglaOrgaoSistema(baseUrl: string): string | null {
  try {
    const host = new URL(baseUrl).hostname;
    const m = host.match(/\.([a-z]{2})\.gov\.br$/i) ?? host.match(/(?:^|\.)sei\.([a-z]{2})\./i);
    return m ? m[1]!.toUpperCase() : null;
  } catch { return null; }
}
