import { describe, it, expect } from 'vitest';
import {
  parseLoginForm, resolveOrgaoValue, parseLinksByAcao, parseProcessosDaHome, parsePesquisaForm,
  parseArvoreFrameUrl, parseDocumentosFromArvore,
} from '../../src/shared/acl/sei/sei-parse.js';
import { deriveSiglaOrgaoSistema } from '../../src/shared/acl/sei/sei-urls.js';

/**
 * Parsers da camada web do SEI (portados de ../api_sei, reescritos em regex). Fixtures de HTML do SEI
 * representativas — validam o CAMINHO REAL do adapter sem rede. Confirmar contra o HTML real do órgão
 * fica como gate de QA.
 */
const BASE = 'https://app.sei.ac.gov.br';

const LOGIN_HTML = `
<html><body>
  <form id="frmLogin" method="post" action="/sip/login.php?sigla_orgao_sistema=AC&sigla_sistema=SEI">
    <input type="hidden" name="hdnAcao" value="2" />
    <input type="text" name="txtUsuario" />
    <select name="selOrgao" id="selOrgao">
      <option value="">Selecione</option>
      <option value="7">TCE</option>
      <option value="9">SEICT</option>
    </select>
  </form>
</body></html>`;

describe('SEI · parseLoginForm', () => {
  it('extrai action, ocultos e options do órgão (ignora placeholder vazio)', () => {
    const form = parseLoginForm(LOGIN_HTML, BASE);
    expect(form.action).toBe('https://app.sei.ac.gov.br/sip/login.php?sigla_orgao_sistema=AC&sigla_sistema=SEI');
    expect(form.hidden['hdnAcao']).toBe('2');
    expect(form.orgaos).toEqual([{ value: '7', text: 'TCE' }, { value: '9', text: 'SEICT' }]);
  });

  it('resolveOrgaoValue: exato (case-insensitive), parcial e null', () => {
    const orgaos = [{ value: '7', text: 'TCE' }, { value: '9', text: 'SEICT' }];
    expect(resolveOrgaoValue(orgaos, 'seict')).toBe('9');
    expect(resolveOrgaoValue([{ value: '9', text: 'SEICT - Secretaria' }], 'SEICT')).toBe('9');
    expect(resolveOrgaoValue(orgaos, 'inexistente')).toBeNull();
  });
});

describe('SEI · deriveSiglaOrgaoSistema', () => {
  it('deriva a UF do host', () => {
    expect(deriveSiglaOrgaoSistema('https://app.sei.ac.gov.br')).toBe('AC');
    expect(deriveSiglaOrgaoSistema('https://sei.sp.gov.br')).toBe('SP');
    expect(deriveSiglaOrgaoSistema('https://exemplo.com')).toBeNull();
  });
});

describe('SEI · links e processos', () => {
  const HOME = `
    <a href="/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=18273502&infra_hash=h1">4004.017444.00012/2026-02</a>
    <a href="/sei/controlador.php?acao=procedimento_trabalhar&id_procedimento=18273502&infra_hash=h1">4004.017444.00012/2026-02</a>
    <a href="/sei/controlador.php?acao=procedimento_escolher_tipo&infra_hash=h9">Iniciar Processo</a>
    <a href="/outra.php">ignorar</a>`;

  it('parseLinksByAcao filtra por ação e captura o hash', () => {
    const links = parseLinksByAcao(HOME, BASE, 'procedimento_escolher_tipo');
    expect(links).toHaveLength(1);
    expect(links[0]!.infraHash).toBe('h9');
  });

  it('parseProcessosDaHome deduplica por id e valida o formato do número', () => {
    const procs = parseProcessosDaHome(HOME, BASE);
    expect(procs).toHaveLength(1);
    expect(procs[0]).toMatchObject({ idProtocolo: '18273502', numero: '4004.017444.00012/2026-02' });
  });
});

describe('SEI · pesquisa e árvore', () => {
  it('parsePesquisaForm acha o action com hash do form de pesquisa rápida', () => {
    const html = `<form action="/sei/controlador.php?acao=protocolo_pesquisa_rapida&infra_hash=hp" method="post"><input id="txtPesquisaRapida" name="txtPesquisaRapida" /></form>`;
    expect(parsePesquisaForm(html, BASE)).toMatchObject({ field: 'txtPesquisaRapida' });
    expect(parsePesquisaForm(html, BASE)!.action).toContain('infra_hash=hp');
    expect(parsePesquisaForm('<html></html>', BASE)).toBeNull();
  });

  it('parseArvoreFrameUrl e parseDocumentosFromArvore extraem os documentos', () => {
    const proc = `<iframe id="ifrArvore" name="ifrArvore" src="/sei/controlador.php?acao=procedimento_visualizar&id_procedimento=1&infra_hash=harv"></iframe>`;
    const arvoreUrl = parseArvoreFrameUrl(proc, BASE);
    expect(arvoreUrl).toContain('acao=procedimento_visualizar');
    const arvore = `<script>Nos[6] = new infraArvoreNo("DOCUMENTO","999001","PASTA1","about:blank","ifr","Doc 1 (0001)","Doc 1","svg.svg");</script>`;
    const docs = parseDocumentosFromArvore(arvore);
    expect(docs).toEqual([{ idDocumento: '999001', titulo: 'Doc 1 (0001)', pasta: 'PASTA1' }]);
  });
});
