import { describe, it, expect } from 'vitest';
import { Consentimento, ConsentimentoInvalido } from '../../src/credenciamento/domain/consentimento.js';
import { ConsentimentoRepositoryMemory } from '../../src/credenciamento/adapters/consentimento-repository-memory.js';

const base = {
  id: 'c1', fornecedorId: 'f1', finalidade: 'credenciamento', versaoTermo: 'v1',
  concedidoEm: '2026-06-29T00:00:00Z', titularRef: 'u-1',
};

describe('Consentimento (domínio) — prova LGPD', () => {
  it('exige finalidade (base legal) e versão do termo (RN016/RF001)', () => {
    expect(() => Consentimento.conceder({ ...base, finalidade: '' })).toThrow(ConsentimentoInvalido);
    expect(() => Consentimento.conceder({ ...base, versaoTermo: '' })).toThrow(ConsentimentoInvalido);
  });

  it('round-trip estado()/deEstado() preserva o agregado (durabilidade — migração 0017)', () => {
    const c = Consentimento.conceder(base);
    const restaurado = Consentimento.deEstado(c.estado());
    expect(restaurado.estado()).toEqual(c.estado());
    expect(restaurado.finalidade).toBe('credenciamento');
    expect(restaurado.versaoTermo).toBe('v1');
    expect(restaurado.concedidoEm).toBe('2026-06-29T00:00:00Z');
    expect(restaurado.titularRef).toBe('u-1');
    expect(restaurado.registerDate).toBe('2026-06-29T00:00:00Z'); // auditoria de linha (AD-33)
  });

  it('deEstado reconstrói o fato consumado sem reaplicar a regra de criação', () => {
    // Prova gravada sob um termo antigo continua recuperável mesmo que a validação de hoje mudasse.
    const legado = { ...Consentimento.conceder(base).estado(), finalidade: 'finalidade legada' };
    expect(Consentimento.deEstado(legado).finalidade).toBe('finalidade legada');
  });
});

describe('ConsentimentoRepositoryMemory — append-only (espírito do AD-18)', () => {
  it('grava e recupera o consentimento por id e por fornecedor', async () => {
    const repo = new ConsentimentoRepositoryMemory();
    await repo.salvar(Consentimento.conceder(base));
    expect((await repo.porId('c1'))?.versaoTermo).toBe('v1');
    expect(await repo.porFornecedor('f9')).toEqual([]);
  });

  it('histórico por fornecedor vem na ordem do aceite: revogar/renovar é um NOVO fato, não uma edição', async () => {
    const repo = new ConsentimentoRepositoryMemory();
    await repo.salvar(Consentimento.conceder({ ...base, id: 'c2', concedidoEm: '2026-07-10T00:00:00Z', versaoTermo: 'v2' }));
    await repo.salvar(Consentimento.conceder(base)); // aceite anterior, gravado depois
    const hist = await repo.porFornecedor('f1');
    expect(hist.map((c) => c.versaoTermo)).toEqual(['v1', 'v2']); // ambos preservados, ordenados
  });

  it('salvar o mesmo id é idempotente e NÃO reescreve o fato já registrado (ON CONFLICT DO NOTHING)', async () => {
    const repo = new ConsentimentoRepositoryMemory();
    await repo.salvar(Consentimento.conceder(base));
    await repo.salvar(Consentimento.conceder({ ...base, versaoTermo: 'v2-adulterado' }));
    expect((await repo.porId('c1'))?.versaoTermo).toBe('v1');
    expect((await repo.porFornecedor('f1')).length).toBe(1);
  });
});
