/**
 * Utilitário HTTP para os adaptadores ACL (AD-4). Fetcher injetável (default: fetch global do Node)
 * para permitir testes sem rede. GET JSON com timeout via AbortController.
 *
 * Envia User-Agent + Accept: a BrasilAPI (WAF) responde 403 a requisições sem User-Agent — o fetch
 * do Node (undici) não envia um por padrão, então definimos explicitamente.
 */
export interface RespostaHttp { ok: boolean; status: number; json(): Promise<unknown> }
export type Fetcher = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<RespostaHttp>;

const HEADERS_PADRAO: Record<string, string> = {
  'User-Agent': 'compraMais/1.0 (+https://github.com/hydrosdesenvolvimento/compraMais)',
  Accept: 'application/json',
};

export async function obterJson(fetcher: Fetcher, url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetcher(url, { signal: ctrl.signal, headers: HEADERS_PADRAO });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
    return await resp.json();
  } finally {
    clearTimeout(t);
  }
}
