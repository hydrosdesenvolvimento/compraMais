import { describe, it, expect } from 'vitest';
import { GerarComprovanteCredenciamento, type FornecedorIdentidadeLookup } from './gerar-comprovante-credenciamento.js';
import type { EditalLookup, SecretariaLookup } from './listar-credenciamentos.js';
import { CredenciamentoRepositoryMemory } from '../adapters/credenciamento-repository-memory.js';
import { renderComprovantePdf } from '../adapters/comprovante-pdf.js';
import { Credenciamento } from '../domain/credenciamento.js';

const editais: EditalLookup = {
  porId: async (id) => (id === 'ed1' ? { numero: 'ED-2026/001', objeto: 'Fornecimento de material de limpeza', secretariaId: 'sec1' } : null),
};
const secretarias: SecretariaLookup = { siglaPorId: async (id) => (id === 'sec1' ? 'SEME' : null) };
const fornecedores: FornecedorIdentidadeLookup = {
  porId: async (id) => (id === 'forn1' ? { razaoSocial: 'Indústria Ação & Cia Ltda', cnpj: '11.222.333/0001-81' } : null),
};

/** Credenciamento persistido e já aceito (Passo Concluído) — o cenário do botão "Baixar PDF". */
async function semearAceito(repo: CredenciamentoRepositoryMemory): Promise<string> {
  const c = Credenciamento.iniciar({ id: 'cred1', fornecedorId: 'forn1', editalId: 'ed1', capacidadeTeto: 250 });
  c.registrarProvaDeVida({ status: 'aprovada', score: 0.9, modelo: 'mock-arcface' }, 'titular1', '2026-07-20T12:59:00.000Z'); // gate UC007
  c.aceitarTermo({ versao: 'v1', finalidade: 'credenciamento' }, 'titular1', '2026-07-20T13:00:00.000Z');
  await repo.salvar(c);
  return c.id;
}

describe('GerarComprovanteCredenciamento — montagem do comprovante (UC004)', () => {
  it('reúne edital, secretaria (sigla), empresa e Termo de Aceite do dono do vínculo', async () => {
    const repo = new CredenciamentoRepositoryMemory();
    await semearAceito(repo);
    const uc = new GerarComprovanteCredenciamento(repo, editais, fornecedores, secretarias, () => '2026-07-21T10:00:00.000Z');

    const c = await uc.doFornecedor('cred1', 'forn1');

    expect(c).toMatchObject({
      protocolo: 'cred1',
      numeroEdital: 'ED-2026/001',
      objeto: 'Fornecimento de material de limpeza',
      secretariaSigla: 'SEME',
      estado: 'aceito',
      capacidadeTeto: 250,
      fornecedor: { razaoSocial: 'Indústria Ação & Cia Ltda', cnpj: '11.222.333/0001-81' },
      geradoEm: '2026-07-21T10:00:00.000Z',
    });
    expect(c?.termo).toMatchObject({ versao: 'v1', finalidade: 'credenciamento', aceitoEm: '2026-07-20T13:00:00.000Z' });
  });

  it('nega posse: credenciamento de outra empresa devolve null (controller → 404)', async () => {
    const repo = new CredenciamentoRepositoryMemory();
    await semearAceito(repo);
    const uc = new GerarComprovanteCredenciamento(repo, editais, fornecedores, secretarias);
    expect(await uc.doFornecedor('cred1', 'outra-empresa')).toBeNull();
  });

  it('id inexistente devolve null', async () => {
    const uc = new GerarComprovanteCredenciamento(new CredenciamentoRepositoryMemory(), editais, fornecedores, secretarias);
    expect(await uc.doFornecedor('nao-existe', 'forn1')).toBeNull();
  });

  it('sem lookup de fornecedor a emissão segue (omite o bloco de empresa)', async () => {
    const repo = new CredenciamentoRepositoryMemory();
    await semearAceito(repo);
    const uc = new GerarComprovanteCredenciamento(repo, editais);
    const c = await uc.doFornecedor('cred1', 'forn1');
    expect(c?.fornecedor).toBeNull();
    expect(c?.secretariaSigla).toBe('sec1'); // sem catálogo de secretarias, cai para o id
  });
});

describe('renderComprovantePdf — PDF válido e com os dados do comprovante', () => {
  it('emite um PDF 1.4 de uma página com protocolo e CNPJ desenhados', async () => {
    const repo = new CredenciamentoRepositoryMemory();
    await semearAceito(repo);
    const uc = new GerarComprovanteCredenciamento(repo, editais, fornecedores, secretarias, () => '2026-07-21T10:00:00.000Z');
    const c = await uc.doFornecedor('cred1', 'forn1');

    const bytes = renderComprovantePdf(c!);
    const texto = Buffer.from(bytes).toString('latin1');

    expect(texto.startsWith('%PDF-1.4')).toBe(true);
    expect(texto.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(texto).toContain('xref');
    expect(texto).toContain('/Type /Catalog');
    // O texto é desenhado como literais no content stream (Tj) → os dados aparecem no corpo.
    expect(texto).toContain('cred1');
    expect(texto).toContain('11.222.333/0001-81');
    // Acento do PT-BR (ã de "Razão") preservado em Latin-1/WinAnsi.
    expect(texto).toContain('Razão social'.toUpperCase());
    // Travessão (—) do subtítulo/rodapé mapeado para o byte WinAnsi 0x97 (não vira '?').
    expect(texto).toContain('\x97');
  });
});
