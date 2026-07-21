import { describe, it, expect } from 'vitest';
import { GerirDocumentos } from '../../src/credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory, PiiCipherDev } from '../../src/credenciamento/adapters/documentos-memory.js';

/**
 * Caminho de LEITURA do serviço de arquivos (FR-007/008, AD-19). Antes só existia o `put` (upload);
 * não havia como recuperar o arquivo para Visualizar/Baixar no portal. Estes testes fecham o par
 * `enviar`/`baixar`: o conteúdo é gravado CIFRADO pelo storage e só a camada de aplicação (que detém
 * a `PiiCipher`) o decifra na volta — o storage nunca vê texto em claro.
 */
describe('GerirDocumentos.baixar — caminho de leitura do serviço de arquivos', () => {
  function montar() {
    const repo = new DocumentoRepositoryMemory();
    const storage = new ObjectStorageMemory();
    const cipher = new PiiCipherDev();
    const docs = new GerirDocumentos(repo, storage, cipher);
    return { docs, storage, cipher };
  }

  it('enviar seguido de baixar devolve o conteúdo original decifrado, com tipo e formato', async () => {
    const { docs } = montar();
    const { documentoId } = await docs.enviar({ fornecedorId: 'f1', tipo: 'Contrato Social', formato: 'pdf', conteudo: 'BYTES-DO-PDF', dataValidade: '2028-01-09' });

    const out = await docs.baixar(documentoId);

    expect(out).not.toBeNull();
    expect(out!.tipo).toBe('Contrato Social');
    expect(out!.formato).toBe('pdf');
    expect(out!.conteudo).toBe('BYTES-DO-PDF');
    expect(out!.dataValidade).toBe('2028-01-09');
  });

  it('o storage guarda o conteúdo CIFRADO, nunca em claro (AD-19)', async () => {
    const { docs, storage } = montar();
    const { documentoId } = await docs.enviar({ fornecedorId: 'f1', tipo: 'CNPJ', formato: 'png', conteudo: 'SEGREDO' });

    // o ref persistido no agregado aponta para um blob que NÃO é o texto em claro
    const out = await docs.baixar(documentoId);
    const refCifrado = await storage.get(`mem://f1/${documentoId}`);
    expect(refCifrado).not.toBeNull();
    expect(refCifrado).not.toBe('SEGREDO'); // está cifrado em repouso
    expect(out!.conteudo).toBe('SEGREDO'); // mas volta decifrado
  });

  it('baixar documento inexistente devolve null (404 na borda), não lança', async () => {
    const { docs } = montar();
    await expect(docs.baixar('nao-existe')).resolves.toBeNull();
  });

  it('baixar quando o blob sumiu do storage devolve null (não corrompe a resposta)', async () => {
    const repo = new DocumentoRepositoryMemory();
    const storageVazio = new ObjectStorageMemory(); // storage separado, sem o blob
    const cipher = new PiiCipherDev();
    // grava só o agregado (metadados), sem o conteúdo no storage
    const { Documento } = await import('../../src/credenciamento/domain/documento.js');
    await repo.salvar(Documento.enviar({ id: 'd-orfao', fornecedorId: 'f1', tipo: 'X', arquivoRef: 'mem://f1/d-orfao', formato: 'pdf' }));
    const docs = new GerirDocumentos(repo, storageVazio, cipher);

    await expect(docs.baixar('d-orfao')).resolves.toBeNull();
  });
});

describe('ObjectStorageMemory.get — simetria com put', () => {
  it('put devolve um ref que get consegue resolver de volta ao mesmo blob', async () => {
    const storage = new ObjectStorageMemory();
    const ref = await storage.put('f1/d1', 'blob-cifrado');
    expect(ref).toBe('mem://f1/d1');
    expect(await storage.get(ref)).toBe('blob-cifrado');
  });

  it('get de ref desconhecido devolve null', async () => {
    const storage = new ObjectStorageMemory();
    expect(await storage.get('mem://f1/inexistente')).toBeNull();
  });
});
