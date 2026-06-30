import { describe, it, expect, beforeEach } from 'vitest';
import { Fornecedor } from '../../src/catalogo/domain/fornecedor.js';
import { Cnpj } from '../../src/catalogo/domain/cnpj.js';
import { Edital } from '../../src/editais/domain/edital.js';
import { EditalRepositoryMemory } from '../../src/editais/adapters/edital-repository-memory.js';
import { FornecedorRepositoryMemory } from '../../src/catalogo/adapters/fornecedor-repository-memory.js';
import { ListarEditaisCompativeis, EditalIncompativel } from '../../src/editais/application/listar-editais-compativeis.js';

function fornecedor(id: string, subclasse: string) {
  return Fornecedor.cadastrar({
    id, cnpj: Cnpj.criar('12.345.678/0001-90'), razaoSocial: 'X', porte: 'ME',
    cnaes: [{ codigoSubclasse: subclasse, tipo: 'principal', ativo: true }],
    situacao: 'ativa', origem: 'oficial', contato: {},
  });
}

describe('Vitrine filtrada por CNAE (US2 / D2)', () => {
  let editais: EditalRepositoryMemory; let fr: FornecedorRepositoryMemory; let vitrine: ListarEditaisCompativeis;
  beforeEach(async () => {
    editais = new EditalRepositoryMemory(); fr = new FornecedorRepositoryMemory();
    editais.semear(Edital.criar({ id: 'eX', secretariaId: 's1', objeto: 'merenda', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2099-12-31' }));
    editais.semear(Edital.criar({ id: 'eY', secretariaId: 's2', objeto: 'mobiliario', cnaesAlvo: ['3101200'], quantitativos: 50, prazoVigencia: '2099-12-31' }));
    await fr.salvar(fornecedor('f1', '1091101'));
    vitrine = new ListarEditaisCompativeis(editais, fr);
  });

  it('mostra só compatíveis (subclasse exata)', async () => {
    const lista = await vitrine.listar('f1');
    expect(lista.map((e) => e.id)).toEqual(['eX']);
  });

  it('bloqueia incompatível por link direto (403)', async () => {
    await expect(vitrine.detalhar('f1', 'eY')).rejects.toBeInstanceOf(EditalIncompativel);
  });
});
