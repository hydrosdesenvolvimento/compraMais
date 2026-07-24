// Portado de ../api_sei (sei-sdk) `core/transport.ts` + `node/transport.ts`.
import { SeiError } from './sei-errors.js';
import { CookieJar } from './sei-cookie-jar.js';

/** Resposta normalizada de transporte. */
export interface TransportResponse {
  status: number;
  /** URL final após seguir redirects (o SEI redireciona muito). */
  finalUrl: string;
  headers: Headers;
  body: string;
}

export interface TransportRequest {
  method: 'GET' | 'POST';
  url: string;
  /** Corpo já codificado como application/x-www-form-urlencoded. */
  body?: string;
  headers?: Record<string, string>;
}

/** Porta de transporte. O client só conhece esta interface (Node com cookie jar; fake nos testes). */
export interface Transport {
  request(req: TransportRequest): Promise<TransportResponse>;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

/**
 * Decodifica o corpo respeitando o charset (o SEI serve ISO-8859-1/Windows-1252; `res.text()` assumiria
 * UTF-8 e corromperia acentos). Lê o charset do Content-Type e, na ausência, fareja o `<meta charset>`.
 */
async function decodeBody(res: Response): Promise<string> {
  const buf = await res.arrayBuffer();
  const ct = res.headers.get('content-type') ?? '';
  let charset = (/charset=([^;]+)/i.exec(ct)?.[1] ?? '').trim().toLowerCase();
  if (!charset) {
    const head = new TextDecoder('windows-1252').decode(buf.slice(0, 4096));
    charset = (/charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8').toLowerCase();
  }
  if (charset === 'iso-8859-1' || charset === 'latin1') charset = 'windows-1252';
  try { return new TextDecoder(charset).decode(buf); }
  catch { return new TextDecoder('utf-8').decode(buf); }
}

export interface NodeTransportOptions { userAgent?: string; maxRedirects?: number }

/**
 * Transporte server-side: fetch global do Node + cookie jar próprio + follow manual de redirects
 * (necessário porque o PHPSESSID é regenerado ao longo de login.php → inicializar.php → controlador.php).
 */
export class NodeTransport implements Transport {
  readonly cookies = new CookieJar();
  private readonly ua: string;
  private readonly maxRedirects: number;

  constructor(opts: NodeTransportOptions = {}) {
    this.ua = opts.userAgent ?? DEFAULT_UA;
    this.maxRedirects = opts.maxRedirects ?? 10;
  }

  async request(req: TransportRequest): Promise<TransportResponse> {
    let url = req.url;
    let method = req.method;
    let body = req.body;

    for (let hop = 0; hop <= this.maxRedirects; hop++) {
      const headers: Record<string, string> = {
        'user-agent': this.ua,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...req.headers,
      };
      if (body != null) headers['content-type'] = 'application/x-www-form-urlencoded';
      const cookie = this.cookies.header();
      if (cookie) headers['cookie'] = cookie;

      const res = await fetch(url, { method, headers, redirect: 'manual', ...(body != null ? { body } : {}) });
      this.cookies.setFromResponse(res.headers);

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url).toString();
        method = 'GET';
        body = undefined;
        continue;
      }

      const text = await decodeBody(res);
      return { status: res.status, finalUrl: url, headers: res.headers, body: text };
    }
    throw new SeiError('too_many_redirects', `Excedeu ${this.maxRedirects} redirects para ${req.url}`);
  }
}
