import type { Pool } from 'pg';
import type { VisibilidadePapel, VisibilidadeRepository } from '../application/visibilidade-repository.js';
import { TELAS_ADMIN, ehTelaAdmin, ehPapelConfiguravel, type PapelConfiguravel, type TelaAdminKey } from '../domain/tela-admin.js';

/**
 * Adaptador PostgreSQL da porta VisibilidadeRepository (tabela `perfil_tela_visibilidade`).
 * Um papel CUSTOMIZADO grava uma linha por tela do catálogo com `visivel` (true/false) — assim a mera
 * presença de linhas distingue "customizado" (mesmo que zerado) de "usa o padrão" (sem linhas). Isso
 * sobrevive a restart: a política definida pelo Administrador é durável e compartilhada (como os demais
 * agregados do projeto). `salvar` substitui o conjunto do papel de forma atômica (delete + insert).
 */
export class VisibilidadeRepositoryPg implements VisibilidadeRepository {
  constructor(private readonly pool: Pool) {}

  async carregar(): Promise<VisibilidadePapel[]> {
    const r = await this.pool.query('SELECT papel, tela_key, visivel FROM perfil_tela_visibilidade');
    const mapa = new Map<PapelConfiguravel, TelaAdminKey[]>();
    for (const row of r.rows as Array<{ papel: string; tela_key: string; visivel: boolean }>) {
      if (!ehPapelConfiguravel(row.papel) || !ehTelaAdmin(row.tela_key)) continue;
      if (!mapa.has(row.papel)) mapa.set(row.papel, []);
      if (row.visivel) mapa.get(row.papel)!.push(row.tela_key);
    }
    return [...mapa.entries()].map(([papel, telas]) => ({
      papel,
      telasVisiveis: TELAS_ADMIN.filter((k) => telas.includes(k)),
    }));
  }

  async porPapel(papel: PapelConfiguravel): Promise<VisibilidadePapel | null> {
    const r = await this.pool.query('SELECT tela_key, visivel FROM perfil_tela_visibilidade WHERE papel = $1', [papel]);
    if (r.rowCount === 0) return null; // sem linhas → nunca customizado (usa o padrão)
    const visiveis = new Set(
      (r.rows as Array<{ tela_key: string; visivel: boolean }>).filter((x) => x.visivel).map((x) => x.tela_key),
    );
    return { papel, telasVisiveis: TELAS_ADMIN.filter((k) => visiveis.has(k)) };
  }

  async salvar(papel: PapelConfiguravel, telasVisiveis: TelaAdminKey[], userId: string): Promise<void> {
    const visiveis = new Set(telasVisiveis);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM perfil_tela_visibilidade WHERE papel = $1', [papel]);
      for (const tela of TELAS_ADMIN) {
        await client.query(
          `INSERT INTO perfil_tela_visibilidade (papel, tela_key, visivel, last_user_update)
           VALUES ($1, $2, $3, $4)`,
          [papel, tela, visiveis.has(tela), userId],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
