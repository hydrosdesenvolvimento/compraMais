import { describe, it, expect } from 'vitest';
import { DividaMockGateway } from '../../src/shared/acl/divida/divida-mock.js';

/** Contrato consumidor (Pact) das bases de dívida (AD-4). Esqueleto: expectativa do provedor. */
describe('Contrato dívida (consumidor)', () => {
  it('CNPJ regular → sem_debito com proveniência', async () => {
    const gw = new DividaMockGateway();
    const r = await gw.consultar('12.345.678/0001-90');
    expect(r.frescor).toBe('verificado');
    expect(r.valor?.estado).toBe('sem_debito');
  });

  it('CNPJ com penalidade retorna estado + dataTermino', async () => {
    const gw = new DividaMockGateway(new Map([['99.999.999/0001-99', { estado: 'penalidade', dataTermino: '2027-01-01T00:00:00Z' }]]));
    const r = await gw.consultar('99.999.999/0001-99');
    expect(r.valor?.estado).toBe('penalidade');
    expect(r.valor?.dataTermino).toBeDefined();
  });
});
