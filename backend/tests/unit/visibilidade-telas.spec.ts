import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import { VisibilidadeRepositoryMemory } from '../../src/permissoes/adapters/visibilidade-repository-memory.js';
import {
  GerirVisibilidadeTelas, PapelNaoConfiguravel, TelaDesconhecida,
} from '../../src/permissoes/application/gerir-visibilidade.js';
import { TELAS_ADMIN, VISIBILIDADE_PADRAO, telasPadraoDoPapel } from '../../src/permissoes/domain/tela-admin.js';

const ADMIN = { userId: 'admin-1' };

describe('tela-admin — política padrão (derivada dos papéis)', () => {
  it('administrador tem um conjunto próprio de telas de configuração (não mais "todas")', () => {
    expect(telasPadraoDoPapel('administrador')).toEqual(VISIBILIDADE_PADRAO.administrador);
    expect(telasPadraoDoPapel('administrador')).toContain('perfis');
    expect(telasPadraoDoPapel('administrador')).not.toContain('painel');
  });
  it('papéis internos veem só as telas do seu fluxo', () => {
    expect(telasPadraoDoPapel('cpl')).toEqual(VISIBILIDADE_PADRAO.cpl);
    expect(telasPadraoDoPapel('smga')).toEqual(VISIBILIDADE_PADRAO.smga);
    expect(telasPadraoDoPapel('auditor')).toEqual(['auditoria']);
    expect(telasPadraoDoPapel('dpo')).toEqual(['lgpd']);
  });
  it('papéis externos/desconhecidos não veem nenhuma tela admin', () => {
    expect(telasPadraoDoPapel('titular')).toEqual([]);
    expect(telasPadraoDoPapel('procurador')).toEqual([]);
    expect(telasPadraoDoPapel('rei')).toEqual([]);
  });
  it('telas de configuração exclusivas do admin não estão no padrão de nenhum outro papel', () => {
    const soAdmin = ['secretarias', 'setoresIndustriais', 'tiposArquivos', 'usuarios', 'perfis'];
    for (const papel of Object.keys(VISIBILIDADE_PADRAO) as Array<keyof typeof VISIBILIDADE_PADRAO>) {
      if (papel === 'administrador') continue;
      for (const tela of soAdmin) expect(VISIBILIDADE_PADRAO[papel]).not.toContain(tela);
    }
  });
});

describe('GerirVisibilidadeTelas', () => {
  let repo: VisibilidadeRepositoryMemory; let bus: InMemoryEventBus; let gerir: GerirVisibilidadeTelas;
  beforeEach(() => {
    repo = new VisibilidadeRepositoryMemory(); bus = new InMemoryEventBus();
    gerir = new GerirVisibilidadeTelas(repo, bus);
  });

  it('telasDoPapel usa o padrão quando nunca customizado', async () => {
    expect(await gerir.telasDoPapel('cpl')).toEqual(VISIBILIDADE_PADRAO.cpl);
    expect(await gerir.telasDoPapel('administrador')).toEqual(VISIBILIDADE_PADRAO.administrador);
  });

  it('definir persiste, normaliza (ordem do catálogo + dedup) e emite VisibilidadeTelasAlterada com diff', async () => {
    let evento: { adicionadas: unknown; removidas: unknown } | null = null;
    bus.subscribe('VisibilidadeTelasAlterada', async (e) => { evento = e.payload as never; });
    // fora de ordem e com duplicata; 'auditoria' é nova para o cpl
    const salvo = await gerir.definir('cpl', ['malote', 'gestaoEditais', 'gestaoEditais', 'auditoria', 'contestacoes'], ADMIN);
    expect(salvo).toEqual(TELAS_ADMIN.filter((k) => ['malote', 'gestaoEditais', 'auditoria', 'contestacoes'].includes(k)));
    expect(salvo.filter((k) => k === 'gestaoEditais')).toHaveLength(1); // dedup
    expect(evento).not.toBeNull();
    expect((evento as unknown as { adicionadas: string[] }).adicionadas).toContain('auditoria');
    expect(await gerir.telasDoPapel('cpl')).toEqual(salvo); // override reflete
  });

  it('definir com conjunto vazio zera as telas de um papel sem obrigatórias', async () => {
    await gerir.definir('leitura', [], ADMIN);
    expect(await gerir.telasDoPapel('leitura')).toEqual([]);
  });

  it('administrador é configurável, mas nunca perde `perfis` (anti-lockout)', async () => {
    const salvo = await gerir.definir('administrador', ['malote'], ADMIN);
    expect(salvo).toContain('perfis');
    expect(salvo).toContain('malote');
    // mesmo pedindo o esvaziamento total, `perfis` permanece
    const zerado = await gerir.definir('administrador', [], ADMIN);
    expect(zerado).toEqual(['perfis']);
    expect(await gerir.telasDoPapel('administrador')).toEqual(['perfis']);
  });

  it('não emite evento quando o conjunto não muda', async () => {
    let emitiu = false;
    bus.subscribe('VisibilidadeTelasAlterada', async () => { emitiu = true; });
    await gerir.definir('auditor', ['auditoria'], ADMIN); // igual ao padrão
    expect(emitiu).toBe(false);
  });

  it('recusa papel não configurável (externo) e tela desconhecida', async () => {
    await expect(gerir.definir('titular', ['painel'], ADMIN)).rejects.toBeInstanceOf(PapelNaoConfiguravel);
    await expect(gerir.definir('procurador', ['painel'], ADMIN)).rejects.toBeInstanceOf(PapelNaoConfiguravel);
    await expect(gerir.definir('cpl', ['inexistente'], ADMIN)).rejects.toBeInstanceOf(TelaDesconhecida);
  });

  it('matriz expõe todos os papéis configuráveis (inclusive admin editável) com flags e obrigatórias', async () => {
    await gerir.definir('smga', ['painel'], ADMIN);
    const m = await gerir.matriz();
    expect(m.telas).toEqual([...TELAS_ADMIN]);

    const admin = m.linhas.find((l) => l.papel === 'administrador')!;
    expect(admin.editavel).toBe(true);
    expect(admin.obrigatorias).toEqual(['perfis']);
    expect(admin.telasVisiveis).toEqual(VISIBILIDADE_PADRAO.administrador);

    const smga = m.linhas.find((l) => l.papel === 'smga')!;
    expect(smga.editavel).toBe(true);
    expect(smga.customizado).toBe(true);
    expect(smga.telasVisiveis).toEqual(['painel']);
    expect(smga.obrigatorias).toEqual([]);

    const cpl = m.linhas.find((l) => l.papel === 'cpl')!;
    expect(cpl.customizado).toBe(false);
    expect(cpl.telasVisiveis).toEqual(VISIBILIDADE_PADRAO.cpl);
  });
});
