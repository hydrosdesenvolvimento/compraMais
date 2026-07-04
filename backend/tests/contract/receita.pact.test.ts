/**
 * Contrato consumidor (Pact) do adaptador da Receita (AD-4). Esqueleto: define a expectativa que o
 * provedor (Receita/mock) deve honrar. No CI roda contra @pact-foundation/pact.
 */
import { describe, it, expect } from 'vitest';
import { ReceitaMockGateway } from '../../src/shared/acl/receita/receita-mock.js';

describe('Contrato Receita (consumidor)', () => {
  it('retorna dados verificados com proveniência para CNPJ conhecido', async () => {
    const gw = new ReceitaMockGateway();
    const r = await gw.consultarCnpj('11.222.333/0001-81');
    expect(r.fonte).toBe('Receita');
    expect(['verificado', 'stale', 'indisponivel']).toContain(r.frescor);
    if (r.frescor === 'verificado') {
      expect(r.valor?.cnaes[0]?.codigoSubclasse).toMatch(/^\d{7}$/); // subclasse 7 dígitos (D2)
    }
  });

  it('CNPJ desconhecido degrada para indisponível (circuit/erro) — nunca lança', async () => {
    const gw = new ReceitaMockGateway();
    const r = await gw.consultarCnpj('00.000.000/0000-00');
    expect(r.frescor).toBe('indisponivel');
    expect(r.valor).toBeNull();
  });
});
