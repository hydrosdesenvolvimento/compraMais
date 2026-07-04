import { randomUUID } from 'node:crypto';
import { Cnpj } from '../domain/cnpj.js';
import { Fornecedor, type Cnae, type Endereco, type SituacaoCadastral } from '../domain/fornecedor.js';
import { FornecedorCadastrado } from '../domain/eventos.js';
import { CnpjJaCadastrado, type FornecedorRepository } from './fornecedor-repository.js';
import type { ReceitaGateway } from '../../shared/acl/receita/receita-gateway.js';
import type { EventBus } from '../../shared/events/event-bus.js';
import { Consentimento } from '../../credenciamento/domain/consentimento.js';
import { ContaAcesso } from '../../shared/identity/conta-acesso.js';

export interface ConsentimentoRepository { salvar(c: Consentimento): Promise<void>; }
export interface ContaRepository { salvar(c: ContaAcesso): Promise<void>; }

/**
 * Porta para criar a credencial de login (UC001 passo 4): e-mail/senha vinculados ao fornecedor.
 * Implementada pelo caso de uso de identidade (RegistrarUsuario). Falha em e-mail duplicado.
 */
export interface RegistroLogin {
  executar(input: { email: string; senha: string; nome: string; papel?: 'titular'; fornecedorId?: string | null }): Promise<{ usuarioId: string }>;
}

export interface CadastrarInput {
  cnpjRaw: string;
  manual?: { razaoSocial: string; porte: string; cnaes: Cnae[]; situacao?: SituacaoCadastral };
  contato: { nomeFantasia?: string; endereco?: Endereco; telefone?: string };
  consentimento: { finalidade: string; versaoTermo: string };
  titular: { identificador: string }; // e-mail do titular (login)
  senha: string; // credencial de login (UC001 passo 4)
  nome?: string; // nome de exibição do login; default = razão social
  ip?: string;
}

export interface CadastrarResultado {
  fornecedorId: string;
  origem: 'oficial' | 'manual';
  status: 'requerente';
  pendenteCovalidacao: boolean; // true quando entrada manual (fail-open + flag, RN002)
}

/**
 * Caso de uso: autocadastro via CNPJ (UC001 — RF001, RF018, RF019). Consulta a Receita pela ACL;
 * se indisponível, aceita entrada manual marcada para covalidação (A1). Bloqueia CNPJ inválido
 * (VO Cnpj) e situação não-ativa (Fornecedor.cadastrar). Cria Fornecedor(Requerente) +
 * conta de login + ContaAcesso(titular) + Consentimento e emite evento auditável.
 */
export class CadastrarFornecedor {
  constructor(
    private readonly fornecedores: FornecedorRepository,
    private readonly consentimentos: ConsentimentoRepository,
    private readonly contas: ContaRepository,
    private readonly receita: ReceitaGateway,
    private readonly login: RegistroLogin,
    private readonly bus: EventBus,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(input: CadastrarInput): Promise<CadastrarResultado> {
    const cnpj = Cnpj.criar(input.cnpjRaw); // exceção UC001: CNPJ inválido → CnpjInvalido
    if (await this.fornecedores.porCnpj(cnpj)) throw new CnpjJaCadastrado();

    const consulta = await this.receita.consultarCnpj(cnpj.valor);
    let origem: 'oficial' | 'manual';
    let dados: { razaoSocial: string; porte: string; cnaes: Cnae[]; situacao: SituacaoCadastral };
    let enderecoOficial: Endereco | undefined;
    let sincronizadoEm: string | null = null;

    if (consulta.frescor === 'verificado' && consulta.valor) {
      const v = consulta.valor;
      origem = 'oficial';
      // Situação vem da Receita (UC001 pré-condição "válido e ativo"): não-ativa é bloqueada adiante.
      dados = { razaoSocial: v.razaoSocial, porte: v.porte, cnaes: v.cnaes.map((c) => ({ ...c, ativo: true })), situacao: v.situacaoCadastral };
      if (v.endereco) enderecoOficial = { ...v.endereco };
      sincronizadoEm = consulta.timestamp; // RF018: timestamp da sincronização oficial
    } else if (input.manual) {
      // Fallback manual visível (A1): só prossegue se o cliente enviou os dados manualmente.
      origem = 'manual';
      dados = { razaoSocial: input.manual.razaoSocial, porte: input.manual.porte, cnaes: input.manual.cnaes.map((c) => ({ ...c, ativo: true })), situacao: input.manual.situacao ?? 'ativa' };
    } else {
      throw new ReceitaIndisponivelSemManual();
    }

    // Endereço estruturado geolocalizável (RF019): o informado pelo titular tem precedência sobre o oficial.
    const endereco = input.contato.endereco ?? enderecoOficial;
    const contato = { ...input.contato, endereco };

    const id = randomUUID();
    // Constrói/valida a entidade (situação não-ativa → SituacaoNaoApta) antes de qualquer persistência.
    const fornecedor = Fornecedor.cadastrar({ id, cnpj, ...dados, origem, contato, sincronizadoEm });

    // Credencial de login (UC001 passo 4). Falha em e-mail duplicado antes de persistir o fornecedor.
    await this.login.executar({ email: input.titular.identificador, senha: input.senha, nome: input.nome ?? dados.razaoSocial, papel: 'titular', fornecedorId: id });

    await this.fornecedores.salvar(fornecedor);

    const titular = ContaAcesso.criarTitular({ id: randomUUID(), fornecedorId: id, identificador: input.titular.identificador });
    await this.contas.salvar(titular);

    await this.consentimentos.salvar(Consentimento.conceder({
      id: randomUUID(), fornecedorId: id, finalidade: input.consentimento.finalidade,
      versaoTermo: input.consentimento.versaoTermo, concedidoEm: this.now(), titularRef: titular.id,
    }));

    const ev = new FornecedorCadastrado(id, { cnpj: cnpj.valor, origem, ip: input.ip }, { userId: titular.id, empresaId: id });
    await this.bus.publish(ev.toEnvelope(randomUUID(), this.now()));

    return { fornecedorId: id, origem, status: 'requerente', pendenteCovalidacao: origem === 'manual' };
  }
}

export class ReceitaIndisponivelSemManual extends Error {
  constructor() {
    super('Receita unavailable: fill in manually to complete the registration.');
    this.name = 'ReceitaIndisponivelSemManual';
  }
}
