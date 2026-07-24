import { describe, it, expect } from 'vitest';
import { SeiClient, createNodeSeiClient, type SeiContext } from '../../src/shared/acl/sei/sei-client.js';
import type { Transport, TransportRequest, TransportResponse } from '../../src/shared/acl/sei/sei-transport.js';

/** Transporte falso programável (mesmo padrão de ../api_sei) — exercita o caminho real sem rede. */
class FakeTransport implements Transport {
  calls: TransportRequest[] = [];
  constructor(private readonly handler: (req: TransportRequest) => TransportResponse) {}
  async request(req: TransportRequest): Promise<TransportResponse> { this.calls.push(req); return this.handler(req); }
}
const res = (p: Partial<TransportResponse> & { finalUrl: string }): TransportResponse => ({ status: 200, headers: new Headers(), body: '', ...p });

const ctx: SeiContext = { baseUrl: 'https://app.sei.ac.gov.br', infraSistema: '100000100', infraUnidadeAtual: '110005958' };
const HOME = `<form action="/sei/controlador.php?acao=protocolo_pesquisa_rapida&infra_hash=h1" method="post"><input id="txtPesquisaRapida" name="txtPesquisaRapida" /></form>`;
const PROCESSO = `<iframe id="ifrArvore" name="ifrArvore" src="/sei/controlador.php?acao=procedimento_visualizar&id_procedimento=23351546&infra_hash=harv"></iframe>`;
const ARVORE = `<script>Nos[6] = new infraArvoreNo("DOCUMENTO","999001","PASTA1","about:blank","ifr","Doc 1 (0001)","Doc 1","svg.svg");</script>`;

describe('SeiClient.pesquisarProcesso', () => {
  it('posta a pesquisa (no action com hash) e abre o processo com seus documentos', async () => {
    const transport = new FakeTransport((req) => {
      if (req.url.includes('acao=protocolo_pesquisa_rapida')) {
        return res({ finalUrl: 'https://app.sei.ac.gov.br/sei/controlador.php?acao=procedimento_trabalhar&id_protocolo=23351546&infra_hash=h2', body: PROCESSO });
      }
      if (req.url.includes('acao=procedimento_visualizar')) return res({ finalUrl: req.url, body: ARVORE });
      throw new Error(`inesperado: ${req.url}`);
    });
    const client = new SeiClient(transport, ctx, HOME);
    const p = await client.pesquisarProcesso('4004.017444.00012/2026-02');
    expect(p.idProtocolo).toBe('23351546');
    expect(p.documentos?.[0]).toMatchObject({ idDocumento: '999001', titulo: 'Doc 1 (0001)' });
    expect(transport.calls[0]?.method).toBe('POST');
    expect(transport.calls[0]?.url).toContain('infra_hash=h1');
    expect(transport.calls[0]?.body).toContain('txtPesquisaRapida=4004');
  });

  it('lança session_expired quando o SEI redireciona ao login', async () => {
    const transport = new FakeTransport(() => res({ finalUrl: 'https://app.sei.ac.gov.br/sip/login.php?sigla_sistema=SEI' }));
    await expect(new SeiClient(transport, ctx, HOME).pesquisarProcesso('x')).rejects.toMatchObject({ code: 'session_expired' });
  });

  it('exige a home renderizada para achar o form de pesquisa (parse_error)', async () => {
    const transport = new FakeTransport(() => res({ finalUrl: 'x' }));
    await expect(new SeiClient(transport, ctx, '<html></html>').pesquisarProcesso('x')).rejects.toMatchObject({ code: 'parse_error' });
  });
});

describe('createNodeSeiClient (login SSO server-side)', () => {
  it('GET login → resolve selOrgao pelo texto → POST com hdnAcao=2 e chega na home', async () => {
    const LOGIN = `<form id="frmLogin" action="/sip/login.php" method="post"><input type="hidden" name="hdnAcao" value="1" /><select name="selOrgao"><option value="">-</option><option value="9">SEICT</option></select></form>`;
    const transport = new FakeTransport((req) => {
      if (req.url.includes('/sip/login.php') && req.method === 'GET') return res({ finalUrl: req.url, body: LOGIN });
      if (req.url.includes('/sip/login.php') && req.method === 'POST') {
        return res({ finalUrl: 'https://app.sei.ac.gov.br/sei/controlador.php?acao=procedimento_controlar&infra_sistema=100000100&infra_unidade_atual=110005958', body: HOME });
      }
      throw new Error(`inesperado: ${req.url}`);
    });
    const client = await createNodeSeiClient({ baseUrl: 'https://app.sei.ac.gov.br', usuario: 'u', senha: 's', selOrgao: 'SEICT', transport });
    // O POST de login enviou o value resolvido do órgão e forçou hdnAcao=2.
    const post = transport.calls.find((c) => c.method === 'POST');
    expect(post?.body).toContain('selOrgao=9');
    expect(post?.body).toContain('hdnAcao=2');
    expect(client.context.infraSistema).toBe('100000100');
  });

  it('órgão inexistente nas options → login_failed', async () => {
    const LOGIN = `<form id="frmLogin" action="/sip/login.php"><select name="selOrgao"><option value="9">SEICT</option></select></form>`;
    const transport = new FakeTransport(() => res({ finalUrl: 'https://app.sei.ac.gov.br/sip/login.php', body: LOGIN }));
    await expect(createNodeSeiClient({ baseUrl: 'https://app.sei.ac.gov.br', usuario: 'u', senha: 's', selOrgao: 'INEXISTENTE', transport }))
      .rejects.toMatchObject({ code: 'login_failed' });
  });
});
