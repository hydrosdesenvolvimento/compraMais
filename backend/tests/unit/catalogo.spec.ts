import { describe, it, expect } from 'vitest';
import { Secretaria } from '../../src/catalogos/domain/secretaria.js';
import { SetorCnae, CnaeInvalido } from '../../src/catalogos/domain/setor-cnae.js';
import { TipoDocumento, CategoriaInvalida } from '../../src/catalogos/domain/tipo-documento.js';
import { CampoObrigatorio } from '../../src/catalogos/domain/item-catalogo.js';

describe('Catálogos base — domínio (UC020)', () => {
  describe('Secretaria (RF020)', () => {
    const base = { id: 's1', nome: 'Secretaria de Educação', sigla: 'SME', responsavel: 'Ana' };

    it('nasce ativa e expõe a chave natural pela sigla (case-insensitive)', () => {
      const s = Secretaria.criar(base);
      expect(s.ativo).toBe(true);
      expect(s.situacao).toBe('ativo');
      expect(s.chave()).toBe('sme');
    });

    it('exige nome, sigla e responsável', () => {
      expect(() => Secretaria.criar({ ...base, nome: '  ' })).toThrow(CampoObrigatorio);
      expect(() => Secretaria.criar({ ...base, sigla: '' })).toThrow(CampoObrigatorio);
      expect(() => Secretaria.criar({ ...base, responsavel: '' })).toThrow(CampoObrigatorio);
    });

    it('editar devolve o diff antes/depois e ignora campos iguais', () => {
      const s = Secretaria.criar(base);
      const diff = s.editar({ nome: 'Educação e Esporte', sigla: 'SME' }, 'admin1');
      expect(diff.map((d) => d.campo)).toEqual(['nome']);
      expect(s.nome).toBe('Educação e Esporte');
      expect(s.lastUserUpdate).toBe('admin1');
      expect(s.editar({ responsavel: 'Ana' }, 'admin1')).toHaveLength(0);
    });

    it('inativação lógica é idempotente e reversível (RN015)', () => {
      const s = Secretaria.criar(base);
      s.inativar('admin1');
      expect(s.ativo).toBe(false);
      s.inativar('admin1'); // idempotente — não quebra
      expect(s.situacao).toBe('inativo');
      s.reativar('admin1');
      expect(s.ativo).toBe(true);
    });

    it('estado()/deEstado() faz round-trip fiel (AD-33)', () => {
      const s = Secretaria.criar(base);
      s.inativar('admin1');
      const clone = Secretaria.deEstado(s.estado());
      expect(clone.estado()).toEqual(s.estado());
      expect(clone.situacao).toBe('inativo');
    });
  });

  describe('SetorCnae (RF021)', () => {
    it('valida a subclasse CNAE de 7 dígitos (RF003/RN001)', () => {
      expect(() => SetorCnae.criar({ id: 'c1', codigo: '10911', descricao: 'x' })).toThrow(CnaeInvalido);
      expect(() => SetorCnae.criar({ id: 'c1', codigo: 'ABCDEFG', descricao: 'x' })).toThrow(CnaeInvalido);
      const ok = SetorCnae.criar({ id: 'c1', codigo: '1091101', descricao: 'Fabricação de produtos de panificação' });
      expect(ok.codigo).toBe('1091101');
      expect(ok.chave()).toBe('1091101');
    });

    it('categoria é opcional: vazio vira undefined, texto é preservado', () => {
      expect(SetorCnae.criar({ id: 'c1', codigo: '1091101', descricao: 'Panificação' }).categoria).toBeUndefined();
      expect(SetorCnae.criar({ id: 'c1', codigo: '1091101', descricao: 'Panificação', categoria: '  ' }).categoria).toBeUndefined();
      const s = SetorCnae.criar({ id: 'c1', codigo: '1091101', descricao: 'Panificação', categoria: ' Alimentos ' });
      expect(s.categoria).toBe('Alimentos');
    });

    it('editar troca categoria com diff (RF021)', () => {
      const s = SetorCnae.criar({ id: 'c1', codigo: '1412601', descricao: 'Confecção', categoria: 'Têxtil' });
      const diff = s.editar({ categoria: 'Indústria têxtil' }, 'admin1');
      expect(diff.map((d) => d.campo)).toEqual(['categoria']);
      expect(s.categoria).toBe('Indústria têxtil');
      // limpar a categoria (texto vazio → undefined) também gera diff
      expect(s.editar({ categoria: '' }, 'admin1').map((d) => d.campo)).toEqual(['categoria']);
      expect(s.categoria).toBeUndefined();
    });
  });

  describe('TipoDocumento (RF022)', () => {
    const base = { id: 't1', nome: 'Balanço Patrimonial', formato: 'PDF', categoria: 'fiscal' };

    it('normaliza formato, valida categoria e guarda as flags de exigência', () => {
      const t = TipoDocumento.criar({ ...base, exigeExercicio: true, exigeValidade: false });
      expect(t.formato).toBe('pdf');
      expect(t.categoria).toBe('fiscal');
      expect(t.exigeExercicio).toBe(true);
      expect(t.chave()).toBe('balanço patrimonial');
    });

    it('recusa categoria fora de cadastral | fiscal | contratual', () => {
      expect(() => TipoDocumento.criar({ ...base, categoria: 'outra' })).toThrow(CategoriaInvalida);
    });

    it('editar troca flags e categoria com diff', () => {
      const t = TipoDocumento.criar(base);
      const diff = t.editar({ exigeExercicio: true, categoria: 'cadastral' }, 'admin1');
      expect(diff.map((d) => d.campo).sort()).toEqual(['categoria', 'exigeExercicio']);
      expect(t.categoria).toBe('cadastral');
    });
  });
});
