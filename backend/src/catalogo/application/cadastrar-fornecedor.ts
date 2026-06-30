import { randomUUID } from 'node:crypto';
import { Cnpj } from '../domain/cnpj.js';
import { Fornecedor, type Cnae } from '../domain/fornecedor.js';
import { FornecedorCadastrado } from '../domain/eventos.js';
import { CnpjJaCadastrado, type FornecedorRepository } from './fornecedor-repository.js';
import type { ReceitaGateway } from '../../shared/acl/receita/receita-gateway.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import { Consentimento } from '../../credenciamento/domain/consentimento.js';
import { ContaAcesso } from '../../shared/identity/conta-acesso.js';

export interface ConsentimentoRepository { salvar(c: Consentimento): Promise<void>; }
export interface ContaRepository { salvar(c: ContaAcesso): Promise<void>; }

export interface CadastrarInput {
  cnpjRaw: string;
  manual?: { razaoSocial: string; porte: string; cnaes: Cnae[] };
  contato: { nomeFantasia?: string; endereco?: string; telefone?: string };
  consentimento: { finalidade: string; versaoTermo: string };
  titular: { identificador: string };
  ip?: string;
}

export interface CadastrarResultado {
  fornecedorId: string;
  origem: 'oficial' | 'manual';
  pendenteCovalidacao: boolean; // true quando entrada manual (FR-003)
}

/**
 * Caso de uso: autocadastro via CNPJ (FR-001..006, 015). Consulta a Receita pela ACL; se
 * indisponível, aceita entrada manual marcada para covalidação (FR-003). Cria Fornecedor +
 * ContaAcesso(titular) + Consentimento e emite evento auditável.
 */
export class CadastrarFornecedor {
  constructor(
    private readonly fornecedores: FornecedorRepository,
    private readonly consentimentos: ConsentimentoRepository,
    private readonly contas: ContaRepository,
    private readonly receita: ReceitaGateway,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(input: CadastrarInput): Promise<CadastrarResultado> {
    const cnpj = Cnpj.criar(input.cnpjRaw);
    if (await this.fornecedores.porCnpj(cnpj)) throw new CnpjJaCadastrado();

    const consulta = await this.receita.consultarCnpj(cnpj.valor);
    let origem: 'oficial' | 'manual';
    let dados: { razaoSocial: string; porte: string; cnaes: Cnae[]; situacao: 'ativa' };

    if (consulta.frescor === 'verificado' && consulta.valor) {
      origem = 'oficial';
      dados = { ...consulta.valor, cnaes: consulta.valor.cnaes.map((c) => ({ ...c, ativo: true })), situacao: 'ativa' };
    } else if (input.manual) {
      // Fallback manual visível (FR-003): só prossegue se o cliente enviou os dados manualmente.
      origem = 'manual';
      dados = { ...input.manual, cnaes: input.manual.cnaes.map((c) => ({ ...c, ativo: true })), situacao: 'ativa' };
    } else {
      throw new ReceitaIndisponivelSemManual();
    }

    const id = randomUUID();
    const fornecedor = Fornecedor.cadastrar({ id, cnpj, ...dados, origem, contato: input.contato });
    await this.fornecedores.salvar(fornecedor);

    const titular = ContaAcesso.criarTitular({ id: randomUUID(), fornecedorId: id, identificador: input.titular.identificador });
    await this.contas.salvar(titular);

    await this.consentimentos.salvar(Consentimento.conceder({
      id: randomUUID(), fornecedorId: id, finalidade: input.consentimento.finalidade,
      versaoTermo: input.consentimento.versaoTermo, concedidoEm: this.now(), titularRef: titular.id,
    }));

    const ev = new FornecedorCadastrado(id, { cnpj: cnpj.valor, origem, ip: input.ip }, { userId: titular.id, empresaId: id });
    await this.bus.publish(ev.toEnvelope(randomUUID(), this.now()));

    return { fornecedorId: id, origem, pendenteCovalidacao: origem === 'manual' };
  }
}

export class ReceitaIndisponivelSemManual extends Error {
  constructor() {
    super('Receita indisponível: preencha manualmente para concluir o cadastro.');
    this.name = 'ReceitaIndisponivelSemManual';
  }
}
