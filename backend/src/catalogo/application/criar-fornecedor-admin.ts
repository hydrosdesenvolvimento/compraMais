import { randomUUID } from 'node:crypto';
import { Cnpj } from '../domain/cnpj.js';
import { Fornecedor } from '../domain/fornecedor.js';
import { FornecedorCadastrado } from '../domain/eventos.js';
import { CnpjJaCadastrado, type FornecedorRepository } from './fornecedor-repository.js';
import type { EventBus } from '../../shared/events/event-bus.js';

export interface CriarFornecedorAdminInput {
  cnpjRaw: string;
  razaoSocial: string;
  porte: string;
  cnaePrincipal: string; // subclasse de 7 dígitos, com ou sem máscara (ex.: "1412-6/01" ou "1412601")
  nomeFantasia?: string;
  telefone?: string;
}

export interface CriarFornecedorAdminResultado {
  fornecedorId: string;
  origem: 'manual';
  status: 'requerente';
}

/**
 * RN015/FR-013: campos obrigatórios ausentes ou CNAE fora do formato (7 dígitos) na borda administrativa.
 * Distinto de CnpjInvalido (formato/DV do CNPJ) e CnpjJaCadastrado (unicidade).
 */
export class DadosFornecedorInvalidos extends Error {
  constructor(motivo: string) {
    super(`Invalid supplier data: ${motivo}`);
    this.name = 'DadosFornecedorInvalidos';
  }
}

/**
 * Cadastro ADMINISTRATIVO de fornecedor (Painel Admin · "Novo fornecedor"). Diferente do autocadastro
 * público (UC001/CadastrarFornecedor): aqui o servidor (smga/administrador) insere a empresa
 * MANUALMENTE — sem credencial de login, sem ContaAcesso e sem Consentimento LGPD (não há titular
 * declarando finalidade). Origem `manual` (nasce `requerente`); a validação documental segue pela
 * covalidação (UC006). Mantém as invariantes do agregado: CNPJ válido/único e situação `ativa`.
 */
export class CriarFornecedorAdmin {
  constructor(
    private readonly fornecedores: FornecedorRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(input: CriarFornecedorAdminInput, actor: { userId: string }): Promise<CriarFornecedorAdminResultado> {
    const cnpj = Cnpj.criar(input.cnpjRaw); // CnpjInvalido quando formato/DV não batem
    if (await this.fornecedores.porCnpj(cnpj)) throw new CnpjJaCadastrado();

    const razaoSocial = input.razaoSocial?.trim();
    const porte = input.porte?.trim();
    if (!razaoSocial) throw new DadosFornecedorInvalidos('razaoSocial is required');
    if (!porte) throw new DadosFornecedorInvalidos('porte is required');

    const subclasse = (input.cnaePrincipal ?? '').replace(/\D/g, '');
    if (subclasse.length !== 7) throw new DadosFornecedorInvalidos('cnaePrincipal must have 7 digits');

    const id = randomUUID();
    const fornecedor = Fornecedor.cadastrar({
      id,
      cnpj,
      razaoSocial,
      porte,
      cnaes: [{ codigoSubclasse: subclasse, tipo: 'principal', ativo: true }],
      situacao: 'ativa',
      origem: 'manual',
      contato: { nomeFantasia: input.nomeFantasia?.trim() || undefined, telefone: input.telefone?.trim() || undefined },
      userName: actor.userId,
    });
    await this.fornecedores.salvar(fornecedor);

    await this.bus.publish(
      new FornecedorCadastrado(id, { cnpj: cnpj.valor, origem: 'manual' }, { userId: actor.userId, empresaId: id })
        .toEnvelope(randomUUID(), this.now()),
    );

    return { fornecedorId: id, origem: 'manual', status: 'requerente' };
  }
}
