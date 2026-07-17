import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server.js';

/**
 * ⛔ TESTES VERMELHOS — abrem a Fase 2 (2026-07-16).
 *
 * O RBAC do backend confia no header `x-papel`, que é texto escolhido pelo cliente.
 * A política de papéis (AD-35) está correta e testada; a IDENTIDADE não é verificada.
 * Qualquer pessoa com `curl` se declara administrador.
 *
 * Verificado em execução contra o container de dev com Postgres real — 10/10 rotas
 * protegidas abriram sem token:
 *   /auditoria · /auditoria/exportar · /admin/usuarios · /admin/cargos · /admin/dashboard
 *   /catalogos/:c · /titular/solicitacoes · /malotes · /permissoes/telas   → `x-papel: administrador`
 *   /gestao/editais                                                        → `x-papel: smga` (ou `cpl`)
 * `/admin/usuarios` devolveu nome, e-mail, cargo e papel de servidores da Prefeitura.
 *
 * AD-20 (espinha, status final) já manda o contrário: JWT HS256 com `sub`/`papel`/`empresaId`.
 * O `token-service.ts` existe, funciona e é exigido em apenas 3 rotas
 * (`/auth/me`, `/auth/senha`, `/auth/google/vincular`).
 *
 * ⚠️ Ao consertar, `rbac-auditoria.spec.ts` vai QUEBRAR: ele injeta `x-papel: auditor`
 * sem token e espera 200 (linhas 20–25). Aquele verde afirma o defeito como contrato.
 * Não apague — atualize, para que a próxima pessoa leia o que ele estava dizendo.
 *
 * Estes testes FALHAM hoje, de propósito. Ficam vermelhos até o AD-20 ser cumprido.
 */
describe('⛔ identidade: RBAC exige JWT, não um header de texto (AD-20, AD-35)', () => {
  const ROTAS_PROTEGIDAS: ReadonlyArray<readonly [string, string]> = [
    ['/auditoria', 'administrador'],
    ['/auditoria/exportar?formato=csv', 'auditor'],
    ['/admin/usuarios', 'administrador'],
    ['/admin/cargos', 'administrador'],
    ['/admin/dashboard', 'administrador'],
    ['/gestao/editais', 'smga'],
    ['/titular/solicitacoes', 'dpo'],
    ['/malotes', 'cpl'],
    ['/permissoes/telas', 'administrador'],
  ];

  it.each(ROTAS_PROTEGIDAS)(
    'GET %s: header `x-papel: %s` SEM token não pode autorizar',
    async (url, papel) => {
      const app = await buildServer();
      const res = await app.inject({
        method: 'GET',
        url,
        headers: { 'x-papel': papel, 'x-user-id': 'nao-autenticado' },
      });
      await app.close();

      // Sem Bearer válido a identidade é desconhecida → 401. Nunca 200.
      expect(res.statusCode).not.toBe(200);
      expect(res.statusCode).toBe(401);
    },
  );

  /**
   * Correção de escopo (Tech Lead, 2026-07-16). Este caso nasceu como
   * `GET /catalogos/secretarias` na lista acima, por engano: a sonda viu o GET abrir sem token e
   * o leu como porta arrombada. O GET nunca foi protegido — a leitura de catálogo é aberta por
   * decisão registrada (UC020: dado de referência, consumido por editais/upload; o próprio
   * `catalogos-controller.ts` já o declarava). Quem exige Administrador é a ESCRITA, e é ela que
   * precisa provar que não autoriza por header. Fechar o GET para deixar a linha verde teria
   * revertido uma decisão de produto para satisfazer um teste.
   */
  it('escrita em catálogo: `x-papel: administrador` SEM token não pode autorizar', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/catalogos/secretarias',
      headers: { 'x-papel': 'administrador', 'x-user-id': 'nao-autenticado' },
      payload: { chave: 'SEMSA', nome: 'Secretaria Municipal de Saúde' },
    });
    await app.close();

    expect(res.statusCode).not.toBe(201);
    expect(res.statusCode).toBe(401);
  });

  it('escalação de papel: trocar `x-papel` não pode mudar a autorização', async () => {
    const app = await buildServer();
    const negado = await app.inject({
      method: 'GET',
      url: '/auditoria',
      headers: { 'x-papel': 'fornecedor', 'x-user-id': 'u1' },
    });
    const promovido = await app.inject({
      method: 'GET',
      url: '/auditoria',
      headers: { 'x-papel': 'administrador', 'x-user-id': 'u1' },
    });
    await app.close();

    // Mesmo chamador, uma palavra diferente. Hoje: 403 → 200.
    expect(promovido.statusCode).toBe(negado.statusCode);
  });

  it('token inválido não pode ser tratado como ausente e cair no header', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/auditoria',
      headers: { authorization: 'Bearer nao-e-um-jwt', 'x-papel': 'administrador' },
    });
    await app.close();

    expect(res.statusCode).toBe(401);
  });
});
