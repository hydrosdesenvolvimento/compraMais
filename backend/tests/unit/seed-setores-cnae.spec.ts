import { describe, it, expect } from 'vitest';
import { CNAE_SQL_PATH, lerScriptCnae } from '../../src/shared/db/seed-setores-cnae.js';
import { SetorCnae } from '../../src/catalogos/domain/setor-cnae.js';

/**
 * O seed de CNAEs (RF021) não tem lista em TypeScript: a fonte única é o `.sql` versionado em
 * `backend/scripts/`, executado tanto por psql (dentro do container do banco) quanto pelo `seed:prod`
 * via node-pg. Estes casos travam as duas propriedades que essa escolha exige:
 *   1. o arquivo é ALCANÇÁVEL a partir do módulo (em `src/` e em `dist/`, dentro da imagem);
 *   2. é SQL PURO — meta-comando de psql (`\set`, `\timing`, `\i`) quebraria o driver no seed:prod.
 */
describe('seed de setores CNAE — asset SQL', () => {
  const sql = lerScriptCnae();

  it('encontra o script versionado a partir do módulo', () => {
    expect(CNAE_SQL_PATH.endsWith('seed-cnae-brasil.sql')).toBe(true);
    expect(sql.length).toBeGreaterThan(10_000);
  });

  it('não contém meta-comando de psql (executável também por node-pg)', () => {
    const metas = sql.split('\n').filter((l) => /^\s*\\/.test(l));
    expect(metas).toEqual([]);
  });

  it('carrega as 1.332 subclasses da CNAE 2.3, todas com 7 dígitos e válidas no domínio', () => {
    const codigos = [...sql.matchAll(/^ {2}\('(\d+)',/gm)].map((m) => m[1] as string);
    expect(codigos).toHaveLength(1332);
    expect(new Set(codigos).size).toBe(1332);
    // Amostra pelo próprio domínio: o que o seed grava tem de passar na regra do agregado.
    for (const codigo of [codigos[0]!, codigos[665]!, codigos[1331]!]) {
      expect(() => SetorCnae.criar({ id: 'x', codigo, descricao: 'amostra' })).not.toThrow();
    }
  });

  it('é idempotente por construção: insere só o ausente e não apaga nada', () => {
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).not.toMatch(/\b(DELETE|TRUNCATE|DROP TABLE setores_cnae)\b/i);
    // Atualização restrita às linhas ainda "de propriedade" do seed (não sobrescreve edição de admin).
    expect(sql).toContain("s.last_user_update = 'seed-cnae-brasil'");
  });
});
