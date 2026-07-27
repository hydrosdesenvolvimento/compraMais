import type { PurgaDadosPessoais, ResumoPurga, HistoricoFornecedor, DiretorioTitular } from '../application/executar-exclusao-fornecedor.js';

/**
 * Espelho em memória de `PurgaFornecedorPg` — usado quando o servidor sobe sem banco (testes e dev).
 *
 * Assimetria proposital com o adaptador pg: lá a purga é **uma transação** de SQL; aqui ela é a
 * composição de um `removerDoFornecedor` por repositório. Cada mundo usa o mecanismo que garante
 * atomicidade nele — no Postgres, a transação; em memória, o fato de nada poder falhar no meio.
 */

/** Capacidades mínimas exigidas dos repositórios em memória (cada um já implementa a sua). */
export interface ReposEmMemoriaParaPurga {
  fornecedores: { remover(id: string): Promise<void> };
  documentos: { removerDoFornecedor(fornecedorId: string, manterMetadados: boolean): Promise<number> };
  contas: { removerDoFornecedor(fornecedorId: string): Promise<number> };
  usuarios: { removerDoFornecedor(fornecedorId: string): Promise<number> };
  consentimentos: { removerDoFornecedor(fornecedorId: string): Promise<number> };
  biometria: { removerDoFornecedor(fornecedorId: string): Promise<boolean> };
}

export class PurgaFornecedorMemory implements PurgaDadosPessoais {
  constructor(private readonly repos: ReposEmMemoriaParaPurga) {}

  async purgarDadosPessoais(fornecedorId: string): Promise<ResumoPurga> {
    return this.purgar(fornecedorId, true);
  }

  async apagarCadastro(fornecedorId: string): Promise<ResumoPurga> {
    const resumo = await this.purgar(fornecedorId, false);
    await this.repos.fornecedores.remover(fornecedorId);
    return resumo;
  }

  private async purgar(fornecedorId: string, manterMetadados: boolean): Promise<ResumoPurga> {
    const documentos = await this.repos.documentos.removerDoFornecedor(fornecedorId, manterMetadados);
    const contas = await this.repos.contas.removerDoFornecedor(fornecedorId);
    const usuarios = await this.repos.usuarios.removerDoFornecedor(fornecedorId);
    const consentimentos = await this.repos.consentimentos.removerDoFornecedor(fornecedorId);
    const biometria = await this.repos.biometria.removerDoFornecedor(fornecedorId);
    return { documentos, contas, usuarios, consentimentos, biometria };
  }
}

/**
 * Histórico de participação em memória. Recebe **funções** em vez de repositórios porque cada agregado
 * expõe uma consulta diferente (credenciamentos por fornecedor, contestações por fornecedor, etc.) — o
 * composition root liga cada uma; aqui só interessa se alguma respondeu "sim".
 */
export class HistoricoFornecedorMemory implements HistoricoFornecedor {
  constructor(private readonly sondas: ReadonlyArray<(fornecedorId: string) => Promise<boolean>>) {}

  async possuiHistorico(fornecedorId: string): Promise<boolean> {
    for (const sonda of this.sondas) if (await sonda(fornecedorId)) return true;
    return false;
  }
}

/** Do titular para o fornecedor, via repositório de usuários (mesmo vínculo do `usuarios.fornecedor_id`). */
export class DiretorioTitularMemory implements DiretorioTitular {
  constructor(private readonly usuarios: { porId(id: string): Promise<{ fornecedorId: string | null } | null> }) {}

  async fornecedorDe(titularId: string): Promise<string | null> {
    return (await this.usuarios.porId(titularId))?.fornecedorId ?? null;
  }
}
