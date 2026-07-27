import type { Pool } from 'pg';
import type { PurgaDadosPessoais, ResumoPurga, HistoricoFornecedor, DiretorioTitular } from '../application/executar-exclusao-fornecedor.js';

/**
 * Eliminação de dado pessoal do fornecedor em PostgreSQL (LGPD art. 18, V / UC017).
 *
 * Vive num adaptador dedicado, e não espalhado pelos repositórios de cada agregado, por duas razões:
 * a operação precisa ser **atômica** (uma transação — meio caminho deixaria o cadastro num estado que
 * nenhum invariante descreve) e é a **única** no sistema que apaga linha de dado pessoal, então
 * concentrá-la aqui mantém auditável, num arquivo só, tudo que o direito de eliminação alcança.
 *
 * O que NÃO é tocado, deliberadamente:
 *   - `auditoria` — trilha append-only (AD-18); registra atos administrativos, não é cadastro;
 *   - `credenciamentos`, `distribuicoes`, `contestacoes_cnae`, `bloqueios`, `malotes` — registro da
 *     participação no processo de compras, preservado por obrigação de publicidade (LGPD art. 16, I);
 *   - `documentos` (a LINHA) — o metadado sustenta a auditoria da covalidação ("a certidão foi
 *     aprovada em tal data"); só o **conteúdo** (`documentos_conteudo`, o blob cifrado com PII de
 *     sócios) é apagado.
 */
export class PurgaFornecedorPg implements PurgaDadosPessoais {
  constructor(private readonly pool: Pool) {}

  /** Anonimização: apaga o dado pessoal satélite e preserva os metadados de auditoria. */
  async purgarDadosPessoais(fornecedorId: string): Promise<ResumoPurga> {
    return this.emTransacao(fornecedorId, async (cli) => {
      // Conteúdo dos documentos: a chave do blob é `<fornecedorId>/<documentoId>` (ver GerirDocumentos).
      const blobs = await cli.query(
        `DELETE FROM documentos_conteudo
          WHERE chave IN (SELECT $1 || '/' || id FROM documentos WHERE fornecedor_id = $1)`,
        [fornecedorId],
      );
      // A linha do documento fica, mas perde o ponteiro para um blob que não existe mais.
      await cli.query(
        `UPDATE documentos SET arquivo_ref = '', update_date = now(), last_user_update = 'lgpd-exclusao'
          WHERE fornecedor_id = $1`,
        [fornecedorId],
      );
      const biometria = await cli.query('DELETE FROM fornecedor_biometria WHERE fornecedor_id = $1', [fornecedorId]);
      const consentimentos = await cli.query('DELETE FROM consentimentos WHERE fornecedor_id = $1', [fornecedorId]);
      const contas = await cli.query('DELETE FROM contas_acesso WHERE fornecedor_id = $1', [fornecedorId]);
      // Credenciais de login: apagadas junto — sem elas ninguém acessa o cadastro anonimizado, e o
      // e-mail/nome do titular são dado pessoal direto.
      const usuarios = await cli.query('DELETE FROM usuarios WHERE fornecedor_id = $1', [fornecedorId]);
      // Notificações são mensagens endereçadas à pessoa; não compõem o processo de compras.
      await cli.query('DELETE FROM notificacoes WHERE fornecedor_id = $1', [fornecedorId]);

      return {
        documentos: blobs.rowCount ?? 0,
        contas: contas.rowCount ?? 0,
        usuarios: usuarios.rowCount ?? 0,
        consentimentos: consentimentos.rowCount ?? 0,
        biometria: (biometria.rowCount ?? 0) > 0,
      };
    });
  }

  /** Sem histórico de participação: o cadastro inteiro sai, inclusive a linha do fornecedor. */
  async apagarCadastro(fornecedorId: string): Promise<ResumoPurga> {
    const resumo = await this.purgarDadosPessoais(fornecedorId);
    return this.emTransacao(fornecedorId, async (cli) => {
      const docs = await cli.query('DELETE FROM documentos WHERE fornecedor_id = $1', [fornecedorId]);
      await cli.query('DELETE FROM fornecedores WHERE id = $1', [fornecedorId]);
      // `documentos` só é contado aqui; na anonimização o número reportado é o de blobs apagados.
      return { ...resumo, documentos: Math.max(resumo.documentos, docs.rowCount ?? 0) };
    });
  }

  private async emTransacao<T>(fornecedorId: string, fn: (cli: PoolClientLike) => Promise<T>): Promise<T> {
    const cli = await this.pool.connect();
    try {
      await cli.query('BEGIN');
      const out = await fn(cli);
      await cli.query('COMMIT');
      return out;
    } catch (e) {
      await cli.query('ROLLBACK').catch(() => { /* conexão já perdida */ });
      throw e;
    } finally {
      cli.release();
    }
  }
}

/** Subconjunto do PoolClient usado aqui — evita depender do tipo completo do driver. */
interface PoolClientLike {
  query(sql: string, params?: unknown[]): Promise<{ rowCount: number | null }>;
}

/**
 * Existe participação no processo de compras? Consulta direta e barata (`EXISTS` por tabela, com saída
 * no primeiro acerto). Documentos e biometria de propósito **não** entram: são dado pessoal, não
 * registro de participação — um fornecedor que só enviou documentos e nunca se credenciou pode ter o
 * cadastro apagado por completo.
 */
export class HistoricoFornecedorPg implements HistoricoFornecedor {
  constructor(private readonly pool: Pool) {}

  private static readonly TABELAS = ['credenciamentos', 'contestacoes_cnae', 'bloqueios', 'malotes'] as const;

  async possuiHistorico(fornecedorId: string): Promise<boolean> {
    for (const tabela of HistoricoFornecedorPg.TABELAS) {
      const r = await this.pool.query(`SELECT 1 FROM ${tabela} WHERE fornecedor_id = $1 LIMIT 1`, [fornecedorId]);
      if ((r.rowCount ?? 0) > 0) return true;
    }
    // Distribuições guardam o fornecedor dentro do jsonb de alocações, não em coluna própria.
    const dist = await this.pool.query(
      `SELECT 1 FROM distribuicoes WHERE alocacoes::text LIKE '%' || $1 || '%' LIMIT 1`,
      [fornecedorId],
    );
    return (dist.rowCount ?? 0) > 0;
  }
}

/** Do titular (dono do pedido) para o fornecedor: o vínculo vive em `usuarios.fornecedor_id`. */
export class DiretorioTitularPg implements DiretorioTitular {
  constructor(private readonly pool: Pool) {}

  async fornecedorDe(titularId: string): Promise<string | null> {
    const r = await this.pool.query('SELECT fornecedor_id FROM usuarios WHERE id = $1 LIMIT 1', [titularId]);
    const valor = (r.rows[0] as { fornecedor_id: string | null } | undefined)?.fornecedor_id;
    return valor ?? null;
  }
}
