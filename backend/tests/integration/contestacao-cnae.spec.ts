import { describe, it, expect, beforeEach } from 'vitest';
import { EditalRepositoryMemory } from '../../src/editais/adapters/edital-repository-memory.js';
import { ContestacaoRepositoryMemory } from '../../src/editais/adapters/contestacao-repository-memory.js';
import { GerirEditais } from '../../src/editais/application/gerir-editais.js';
import { ContestarCnae, ResolverContestacao, FornecedorNaoLegitimo } from '../../src/editais/application/contestar-cnae.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';

describe('Contestação de CNAE (US2)', () => {
  let editais: EditalRepositoryMemory; let contestacoes: ContestacaoRepositoryMemory; let bus: InMemoryEventBus;
  let gerir: GerirEditais; let contestar: ContestarCnae; let resolver: ResolverContestacao; let editalId: string;
  const ativos = new Set(['f1']);
  const fornecedorAtivo = { estaAtivo: async (id: string) => ativos.has(id) };

  beforeEach(async () => {
    editais = new EditalRepositoryMemory(); contestacoes = new ContestacaoRepositoryMemory(); bus = new InMemoryEventBus();
    gerir = new GerirEditais(editais, bus, undefined, contestacoes);
    contestar = new ContestarCnae(editais, contestacoes, fornecedorAtivo, bus);
    resolver = new ResolverContestacao(contestacoes, gerir, bus);
    ({ editalId } = await gerir.criar({ secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 10, prazoVigencia: '2099-12-31' }, { userId: 'gestor1' }));
    await gerir.publicar(editalId, { userId: 'gestor1' });
  });

  it('fornecedor ativo abre contestação (pendente)', async () => {
    const { contestacaoId } = await contestar.abrir(editalId, 'f1', '1092900', 'sou compatível');
    expect((await contestacoes.porId(contestacaoId))?.situacao).toBe('pendente');
  });

  it('fornecedor não ativo → não legítimo (403 na borda)', async () => {
    await expect(contestar.abrir(editalId, 'fX', '1092900', 'x')).rejects.toBeInstanceOf(FornecedorNaoLegitimo);
  });

  it('acatar corrige o CNAE do edital (histórico via edição)', async () => {
    const { contestacaoId } = await contestar.abrir(editalId, 'f1', '1092900', 'incluir meu CNAE');
    await resolver.acatar(contestacaoId, ['1091101', '1092900'], { userId: 'cpl1' });
    expect((await editais.porId(editalId))?.cnaesAlvo).toContain('1092900');
    expect((await contestacoes.porId(contestacaoId))?.situacao).toBe('acatada');
  });

  it('encerrar bloqueia com contestação pendente (409 na borda)', async () => {
    await contestar.abrir(editalId, 'f1', '1092900', 'x');
    await expect(gerir.encerrar(editalId, { userId: 'gestor1' })).rejects.toThrow(/pending/i);
  });
});
