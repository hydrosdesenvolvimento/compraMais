import { describe, it, expect, beforeEach } from 'vitest';
import { Covalidar } from '../../src/credenciamento/application/covalidar.js';
import { Documento } from '../../src/credenciamento/domain/documento.js';
import { DocumentoRepositoryMemory } from '../../src/credenciamento/adapters/documentos-memory.js';
import { AnaliseRepositoryMemory } from '../../src/credenciamento/adapters/analise-repository-memory.js';
import { InMemoryEventBus } from '../../src/shared/events/event-bus.js';
import { Fornecedor } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';

/**
 * UC006 — veredito do conjunto. Aprovar o conjunto documental promove o fornecedor a `credenciado`
 * (passo 3); reprovar devolve a `em_correcao` (A1, laço UC016). Fornecedor ausente → só o doc transita.
 */
describe('Covalidar — veredito de habilitação (UC006)', () => {
  let docs: DocumentoRepositoryMemory; let fornecedores: FornecedorRepositoryMemory;
  let bus: InMemoryEventBus; let uc: Covalidar;

  const fornecedorPendente = (id: string) =>
    Fornecedor.deEstado({
      ...Fornecedor.cadastrar({
        id, cnpj: Cnpj.criar('11.222.333/0001-81'), razaoSocial: 'Padaria X', porte: 'ME',
        cnaes: [{ codigoSubclasse: '1091101', tipo: 'principal', ativo: true }], situacao: 'ativa', origem: 'oficial', contato: {},
      }).estado(),
      status: 'pendente_analise',
    });

  beforeEach(async () => {
    docs = new DocumentoRepositoryMemory(); fornecedores = new FornecedorRepositoryMemory();
    bus = new InMemoryEventBus();
    uc = new Covalidar(docs, new AnaliseRepositoryMemory(), bus, fornecedores);
    await fornecedores.salvar(fornecedorPendente('f1'));
    await docs.salvar(Documento.enviar({ id: 'd1', fornecedorId: 'f1', tipo: 'balanco', arquivoRef: 'r', formato: 'pdf' }));
    await docs.salvar(Documento.enviar({ id: 'd2', fornecedorId: 'f1', tipo: 'certidao', arquivoRef: 'r', formato: 'pdf' }));
  });

  it('aprovar o conjunto (todos os documentos) promove o fornecedor a credenciado', async () => {
    let credenciado = '';
    bus.subscribe('FornecedorCredenciado', async (e) => { credenciado = e.eventName; });
    await uc.aprovar('d1', 'cpl1', 'f1');
    expect((await fornecedores.porId('f1'))?.status).toBe('pendente_analise'); // ainda falta d2
    await uc.aprovar('d2', 'cpl1', 'f1');
    expect((await fornecedores.porId('f1'))?.status).toBe('credenciado');
    expect(credenciado).toBe('FornecedorCredenciado');
  });

  it('reprovar um documento devolve o fornecedor a em_correcao e emite o gancho de notificação', async () => {
    let emCorrecao = '';
    bus.subscribe('FornecedorEmCorrecao', async (e) => { emCorrecao = e.eventName; });
    await uc.reprovar('d1', 'cpl1', 'f1', 'Imagem ilegível');
    expect((await fornecedores.porId('f1'))?.status).toBe('em_correcao');
    expect(emCorrecao).toBe('FornecedorEmCorrecao');
  });

  it('não credencia enquanto houver documento reprovado no conjunto', async () => {
    await uc.reprovar('d1', 'cpl1', 'f1', 'ilegível'); // → em_correcao
    await uc.aprovar('d2', 'cpl1', 'f1'); // d1 segue reprovado
    expect((await fornecedores.porId('f1'))?.status).toBe('em_correcao');
  });

  it('sem entidade Fornecedor (nível apenas documental) não quebra o fluxo', async () => {
    await docs.salvar(Documento.enviar({ id: 'dx', fornecedorId: 'fZ', tipo: 'balanco', arquivoRef: 'r', formato: 'pdf' }));
    await expect(uc.aprovar('dx', 'cpl1', 'fZ')).resolves.toBeUndefined();
    expect((await docs.porId('dx'))?.status).toBe('aprovado');
  });
});
