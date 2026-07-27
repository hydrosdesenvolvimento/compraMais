import { randomUUID } from 'node:crypto';
import type { EventBus } from '../../shared/events/event-bus.js';
import type { Fornecedor } from '../../catalogo/domain/fornecedor.js';
import { PoliticaRetencao, type SolicitacaoTitular } from '../domain/solicitacao-titular.js';
import { FornecedorExcluidoLgpd } from '../domain/eventos.js';
import { DescarteRetido, type SolicitacaoRepository } from './gerir-direitos.js';

type Actor = { userId: string };

/** Como o pedido foi atendido: sem histórico o cadastro é apagado; com histórico, anonimizado. */
export type ModoExclusao = 'excluido' | 'anonimizado';

export interface ResultadoExclusao {
  modo: ModoExclusao;
  fornecedorId: string;
  /** O que foi efetivamente eliminado — vira o `resultado` da solicitação e a prestação de contas ao titular. */
  purga: ResumoPurga;
}

export interface ResumoPurga {
  documentos: number;      // documentos cujo conteúdo (blob cifrado) foi apagado
  contas: number;          // contas de acesso revogadas (titular + procuradores)
  usuarios: number;        // credenciais de login eliminadas/redigidas
  consentimentos: number;
  biometria: boolean;      // referência facial removida (dado sensível — LGPD art. 11)
}

// ---------------------------------------------------------------------------------------------- //
// Portas — mínimas e locais, como em `ExcluirMaterialServico`. O composition root as implementa a  //
// partir dos repositórios que já existem; este caso de uso não conhece Postgres nem os agregados   //
// vizinhos.                                                                                        //
// ---------------------------------------------------------------------------------------------- //

/** Resolve o fornecedor a partir do titular que abriu o pedido (a solicitação guarda o `userId`). */
export interface DiretorioTitular {
  fornecedorDe(titularId: string): Promise<string | null>;
}

/** Leitura do agregado Fornecedor limitada ao que este caso de uso precisa. */
export interface FornecedorParaExclusao {
  porId(id: string): Promise<Fornecedor | null>;
  salvar(f: Fornecedor): Promise<void>;
}

/**
 * O fornecedor participou do processo de compras? Credenciamentos, distribuições, contestações,
 * bloqueios e malotes contam como histórico — documentos e biometria NÃO, por serem dado pessoal e não
 * registro de participação. É essa distinção que decide entre apagar e anonimizar.
 */
export interface HistoricoFornecedor {
  possuiHistorico(fornecedorId: string): Promise<boolean>;
}

/** Eliminação do dado pessoal satélite (fora do agregado Fornecedor). */
export interface PurgaDadosPessoais {
  /** Apaga PII preservando os METADADOS que sustentam a auditoria (ex.: o documento existiu e foi aprovado). */
  purgarDadosPessoais(fornecedorId: string): Promise<ResumoPurga>;
  /** Remove o cadastro por completo — só quando não há histórico a preservar. */
  apagarCadastro(fornecedorId: string): Promise<ResumoPurga>;
}

export class SolicitacaoNaoEhExclusao extends Error {
  constructor(tipo: string) {
    super(`Request type is '${tipo}'; only 'exclusao' requests can trigger data erasure.`);
    this.name = 'SolicitacaoNaoEhExclusao';
  }
}
export class TitularSemFornecedor extends Error {
  constructor() {
    super('No supplier is linked to this data subject; nothing to erase.');
    this.name = 'TitularSemFornecedor';
  }
}
export class SolicitacaoJaResolvida extends Error {
  constructor(status: string) {
    super(`Request already resolved (status: ${status}); erasure cannot run twice.`);
    this.name = 'SolicitacaoJaResolvida';
  }
}

/**
 * Execução do direito de eliminação (LGPD art. 18, V) sobre o cadastro do fornecedor — UC017 / FR-004.
 *
 * Até aqui a fila de Atendimento LGPD **registrava** a decisão (`atender`/`recusar`/`descartar`) sem
 * eliminar nada: o pedido virava texto. Este caso de uso executa de fato, com dois desfechos:
 *
 * - **`excluido`** — o fornecedor nunca participou do processo de compras (sem credenciamento,
 *   distribuição, contestação, bloqueio ou malote): o cadastro é apagado por completo. É o caso do
 *   cadastro feito por engano ou de quem se registrou e desistiu.
 * - **`anonimizado`** — há histórico. Apagar a linha levaria junto credenciamentos, distribuições e
 *   malotes, e o ato administrativo publicado precisa continuar dizendo quem foi credenciado. Então o
 *   dado pessoal é eliminado (contato, credenciais, conteúdo dos documentos, biometria) e o registro da
 *   participação permanece, com CNPJ e razão social — dados de pessoa jurídica.
 *
 * Guardas, em ordem:
 *   1. a solicitação existe, é do tipo `exclusao` e ainda está pendente;
 *   2. existe fornecedor vinculado ao titular;
 *   3. **a retenção legal já venceu** (FR-008) — a mesma `PoliticaRetencao` do descarte. Documento
 *      fiscal/contratual guarda 5 anos por obrigação legal (LGPD art. 16, I): o direito de eliminação
 *      não vence essa obrigação, e o pedido é recusado com `DescarteRetido` até o prazo terminar.
 *
 * A trilha de auditoria (AD-18) **nunca** é tocada: ela registra atos administrativos, não é cadastro.
 */
export class ExecutarExclusaoFornecedor {
  constructor(
    private readonly solicitacoes: SolicitacaoRepository,
    private readonly diretorio: DiretorioTitular,
    private readonly fornecedores: FornecedorParaExclusao,
    private readonly historico: HistoricoFornecedor,
    private readonly purga: PurgaDadosPessoais,
    private readonly bus: EventBus,
    private readonly retencao = new PoliticaRetencao({ cadastral: 730, fiscal: 1825, contratual: 1825 }),
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async executar(solicitacaoId: string, actor: Actor): Promise<ResultadoExclusao> {
    const s = await this.exigirPedidoDeExclusao(solicitacaoId);

    const fornecedorId = await this.diretorio.fornecedorDe(s.titularId);
    if (!fornecedorId) throw new TitularSemFornecedor();
    const fornecedor = await this.fornecedores.porId(fornecedorId);
    if (!fornecedor) throw new TitularSemFornecedor();

    // FR-008 — a obrigação legal de guarda prevalece sobre o pedido de eliminação (LGPD art. 16, I).
    // A contagem parte do registro do cadastro, mesma base do `avaliarDescarte`.
    if (!this.retencao.elegivelParaDescarte(s.categoria, fornecedor.registerDate, this.now())) {
      throw new DescarteRetido();
    }

    const quando = this.now();
    const comHistorico = await this.historico.possuiHistorico(fornecedorId);

    let modo: ModoExclusao;
    let purga: ResumoPurga;
    if (comHistorico) {
      modo = 'anonimizado';
      purga = await this.purga.purgarDadosPessoais(fornecedorId);
      fornecedor.anonimizar(quando, actor.userId);
      await this.fornecedores.salvar(fornecedor);
    } else {
      modo = 'excluido';
      purga = await this.purga.apagarCadastro(fornecedorId);
    }

    s.atender(descrever(modo, purga), actor.userId);
    await this.solicitacoes.salvar(s);

    await this.bus.publish(
      new FornecedorExcluidoLgpd(fornecedorId, { solicitacaoId, fornecedorId, modo, ...purga }, { userId: actor.userId })
        .toEnvelope(randomUUID(), quando),
    );

    return { modo, fornecedorId, purga };
  }

  /**
   * O estado do pedido é conferido ANTES de qualquer ação destrutiva. `atender()` também rejeita pedido
   * já resolvido, mas só no fim do fluxo — tarde demais: a purga já teria rodado uma segunda vez.
   */
  private async exigirPedidoDeExclusao(id: string): Promise<SolicitacaoTitular> {
    const s = await this.solicitacoes.porId(id);
    if (!s) throw new SolicitacaoNaoEncontradaLocal();
    if (s.tipo !== 'exclusao') throw new SolicitacaoNaoEhExclusao(s.tipo);
    if (s.status !== 'pendente') throw new SolicitacaoJaResolvida(s.status);
    return s;
  }
}

/** Reexporta o erro de "não encontrada" com o mesmo `name` que a borda já mapeia para 404. */
class SolicitacaoNaoEncontradaLocal extends Error {
  constructor() { super('Request not found.'); this.name = 'SolicitacaoNaoEncontrada'; }
}

/** Texto do `resultado` da solicitação — é o que o titular recebe como prestação de contas. */
function descrever(modo: ModoExclusao, p: ResumoPurga): string {
  const partes = [
    `${p.documentos} document(s)`,
    `${p.contas} access account(s)`,
    `${p.usuarios} login credential(s)`,
    `${p.consentimentos} consent record(s)`,
  ];
  if (p.biometria) partes.push('biometric reference');
  return modo === 'excluido'
    ? `Registration permanently deleted (no procurement history). Erased: ${partes.join(', ')}.`
    : `Personal data erased; procurement history preserved (LGPD art. 16, I). Erased: ${partes.join(', ')}. `
      + 'CNPJ and corporate name were kept as they are legal-entity data in published administrative acts.';
}
