import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import { VisibilidadeRepositoryMemory } from '../../src/permissoes/adapters/visibilidade-repository-memory.js';
import {
  GerirVisibilidadeTelas, PapelNaoConfiguravel, TelaDesconhecida,
} from '../../src/permissoes/application/gerir-visibilidade.js';
import { TELAS_ADMIN, VISIBILIDADE_PADRAO, telasPadraoDoPapel } from '../../src/permissoes/domain/tela-admin.js';

const ADMIN = { userId: 'admin-1' };

describe('tela-admin — política padrão (derivada dos UCs)', () => {
  it('administrador é superusuário: vê todas as telas', () => {
    expect(telasPadraoDoPapel('administrador')).toEqual([...TELAS_ADMIN]);
  });
  it('papéis internos veem só as telas dos seus UCs', () => {
    expect(telasPadraoDoPapel('cpl')).toEqual(VISIBILIDADE_PADRAO.cpl);
    expect(telasPadraoDoPapel('auditor')).toEqual(['auditoria']);
    expect(telasPadraoDoPapel('dpo')).toEqual(['lgpd']);
  });
  it('papéis externos/desconhecidos não veem nenhuma tela admin', () => {
    expect(telasPadraoDoPapel('titular')).toEqual([]);
    expect(telasPadraoDoPapel('procurador')).toEqual([]);
    expect(telasPadraoDoPapel('rei')).toEqual([]);
  });
  it('telas exclusivas do admin não estão no padrão de nenhum papel configurável', () => {
    for (const papel of Object.keys(VISIBILIDADE_PADRAO) as Array<keyof typeof VISIBILIDADE_PADRAO>) {
      expect(VISIBILIDADE_PADRAO[papel]).not.toContain('catalogos');
      expect(VISIBILIDADE_PADRAO[papel]).not.toContain('usuarios');
      expect(VISIBILIDADE_PADRAO[papel]).not.toContain('perfis');
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
    expect(await gerir.telasDoPapel('administrador')).toEqual([...TELAS_ADMIN]);
  });

  it('definir persiste, normaliza (ordem do catálogo + dedup) e emite VisibilidadeTelasAlterada com diff', async () => {
    let evento: { adicionadas: unknown; removidas: unknown } | null = null;
    bus.subscribe('VisibilidadeTelasAlterada', async (e) => { evento = e.payload as never; });
    // fora de ordem e com duplicata; 'auditoria' é nova para o cpl, 'malote' some
    const salvo = await gerir.definir('cpl', ['malote', 'painel', 'painel', 'auditoria', 'covalidacao', 'contestacoes'], ADMIN);
    // some 'malote'? não — o alvo inclui malote. Vamos testar remoção separadamente; aqui checa ordem/dedup.
    expect(salvo).toEqual(TELAS_ADMIN.filter((k) => ['malote', 'painel', 'auditoria', 'covalidacao', 'contestacoes'].includes(k)));
    // painel aparece uma vez só (dedup)
    expect(salvo.filter((k) => k === 'painel')).toHaveLength(1);
    expect(evento).not.toBeNull();
    expect((evento as unknown as { adicionadas: string[] }).adicionadas).toContain('auditoria');
    // persistido: telasDoPapel agora reflete o override
    expect(await gerir.telasDoPapel('cpl')).toEqual(salvo);
  });

  it('definir com conjunto vazio zera as telas do papel (customizado ≠ padrão)', async () => {
    await gerir.definir('leitura', [], ADMIN);
    expect(await gerir.telasDoPapel('leitura')).toEqual([]);
  });

  it('não emite evento quando o conjunto não muda', async () => {
    let emitiu = false;
    bus.subscribe('VisibilidadeTelasAlterada', async () => { emitiu = true; });
    await gerir.definir('auditor', ['auditoria'], ADMIN); // igual ao padrão
    expect(emitiu).toBe(false);
  });

  it('recusa papel não configurável (administrador/titular) e tela desconhecida', async () => {
    await expect(gerir.definir('administrador', ['painel'], ADMIN)).rejects.toBeInstanceOf(PapelNaoConfiguravel);
    await expect(gerir.definir('titular', ['painel'], ADMIN)).rejects.toBeInstanceOf(PapelNaoConfiguravel);
    await expect(gerir.definir('cpl', ['inexistente'], ADMIN)).rejects.toBeInstanceOf(TelaDesconhecida);
  });

  it('matriz expõe administrador não-editável + papéis configuráveis com flag customizado', async () => {
    await gerir.definir('smga', ['painel'], ADMIN);
    const m = await gerir.matriz();
    expect(m.telas).toEqual([...TELAS_ADMIN]);
    const admin = m.linhas.find((l) => l.papel === 'administrador')!;
    expect(admin.editavel).toBe(false);
    expect(admin.telasVisiveis).toEqual([...TELAS_ADMIN]);
    const smga = m.linhas.find((l) => l.papel === 'smga')!;
    expect(smga.editavel).toBe(true);
    expect(smga.customizado).toBe(true);
    expect(smga.telasVisiveis).toEqual(['painel']);
    const cpl = m.linhas.find((l) => l.papel === 'cpl')!;
    expect(cpl.customizado).toBe(false);
    expect(cpl.telasVisiveis).toEqual(VISIBILIDADE_PADRAO.cpl);
  });
});
