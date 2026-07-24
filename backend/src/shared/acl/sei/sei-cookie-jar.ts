// Portado de ../api_sei (sei-sdk) `node/cookie-jar.ts`.
/**
 * Cookie jar mínimo para o fetch do Node (que não persiste cookies). Guarda pares nome=valor; ignora
 * atributos (Path/Domain/HttpOnly) porque todo o fluxo do SEI acontece no mesmo host.
 */
export class CookieJar {
  private readonly jar = new Map<string, string>();

  /** Absorve os Set-Cookie de uma resposta. */
  setFromResponse(headers: Headers): void {
    const list =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : headers.has('set-cookie')
          ? [headers.get('set-cookie') as string]
          : [];
    for (const raw of list) this.setFromHeader(raw);
  }

  setFromHeader(setCookie: string): void {
    const [pair] = setCookie.split(';');
    if (!pair) return;
    const eq = pair.indexOf('=');
    if (eq === -1) return;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!name) return;
    if (value === '' || value.toLowerCase() === 'deleted') this.jar.delete(name);
    else this.jar.set(name, value);
  }

  /** Header Cookie para a próxima requisição, ou string vazia. */
  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  get(name: string): string | undefined { return this.jar.get(name); }
  get size(): number { return this.jar.size; }
}
