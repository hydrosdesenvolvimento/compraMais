import type { CredenciamentoRepository } from './solicitar-credenciamento.js';
import type { EditalLookup, SecretariaLookup } from './listar-credenciamentos.js';
import { TOTAL_PASSOS_CREDENCIAMENTO, type Credenciamento, type EstadoCredenciamento, type StatusProvaVida, type TermoAceite } from '../domain/credenciamento.js';

/**
 * Detalhe de leitura de um credenciamento para a tela "Visualizar" do portal (UC004). Reúne o que o
 * fornecedor precisa para conferir o vínculo concluído — sem dados restritos: número/objeto/secretaria
 * do edital, capacidade declarada (RN005), Termo de Aceite (RN016) e a linha do tempo (criado/atualizado).
 * O protótipo `spec/Prototipo/portal-fornecedor.html` prevê a ação "Visualizar" para os finalizados,
 * mas não desenha a tela — os campos abaixo seguem o Design System e o que o domínio de fato guarda.
 */
export interface CredenciamentoDetalhe {
  id: string;
  editalId: string;
  estado: EstadoCredenciamento;
  numeroEdital: string | null; // ED-AAAA/NNN (null se o edital sumiu)
  objeto: string | null;
  secretariaSigla: string | null; // sigla do catálogo; cai para o id quando não catalogada
  capacidadeTeto: number; // teto declarado (RN005)
  passoAtual: number;
  totalPassos: number;
  provaVidaStatus: StatusProvaVida | null; // veredito da prova de vida facial (UC007); null enquanto não verificada
  termo: TermoAceite | null; // versão + finalidade + timestamp do aceite (RN016); null se ainda não aceito
  criadoEm: string; // ISO-8601
  atualizadoEm: string; // ISO-8601
}

/**
 * Projeção de leitura (UC004 — "Visualizar credenciamento"). Só devolve o credenciamento se ele
 * pertence ao fornecedor informado (dono do vínculo) — a autorização de posse mora aqui, no app,
 * como no `ListarCredenciamentos`; fora disso devolve `null` (o controller responde 404).
 */
export class DetalharCredenciamento {
  constructor(
    private readonly creds: CredenciamentoRepository,
    private readonly editais: EditalLookup,
    private readonly secretarias?: SecretariaLookup,
  ) {}

  async doFornecedor(credenciamentoId: string, fornecedorId: string): Promise<CredenciamentoDetalhe | null> {
    const c = await this.creds.porId(credenciamentoId);
    if (!c || c.fornecedorId !== fornecedorId) return null;
    return this.montar(c);
  }

  /**
   * Credenciamento **ativo** do fornecedor num edital (UC004 · retomada do wizard). Devolve o vínculo
   * `iniciado`/`aceito` para o portal reidratar o wizard no passo salvo (RN005/RN016) em vez de tentar
   * criar outro — o `iniciar` bloquearia com `CredenciamentoDuplicado`. `cancelado` conta como inexistente
   * (A2 é reversível): o fornecedor pode recomeçar do zero. Sem vínculo ativo, devolve `null` (204 no HTTP).
   */
  async doFornecedorNoEdital(fornecedorId: string, editalId: string): Promise<CredenciamentoDetalhe | null> {
    const c = await this.creds.porFornecedorEEdital(fornecedorId, editalId);
    if (!c || c.situacao === 'cancelado') return null;
    return this.montar(c);
  }

  private async montar(c: Credenciamento): Promise<CredenciamentoDetalhe> {
    const e = await this.editais.porId(c.editalId);
    return {
      id: c.id,
      editalId: c.editalId,
      estado: c.situacao,
      numeroEdital: e?.numero ?? null,
      objeto: e?.objeto ?? null,
      secretariaSigla: await this.sigla(e?.secretariaId ?? null),
      capacidadeTeto: c.capacidadeTeto,
      passoAtual: c.passoAtual,
      totalPassos: TOTAL_PASSOS_CREDENCIAMENTO,
      provaVidaStatus: c.provaVida?.status ?? null,
      termo: c.termo ? { ...c.termo } : null,
      criadoEm: c.registerDate,
      atualizadoEm: c.updateDate,
    };
  }

  /** Sigla do catálogo (UC020); sem catálogo ou sem match, devolve o próprio id — nunca quebra. */
  private async sigla(secretariaId: string | null): Promise<string | null> {
    if (!secretariaId) return null;
    if (!this.secretarias) return secretariaId;
    return (await this.secretarias.siglaPorId(secretariaId)) ?? secretariaId;
  }
}
