import { describe, it, expect } from 'vitest';
import { menuAdminVisivel, TELAS_ADMIN } from './telas-admin';
import { homeAdmin } from './guardas';

describe('menuAdminVisivel — filtro do menu admin por telas visíveis', () => {
  it('mantém apenas as telas visíveis, na ordem canônica do catálogo', () => {
    const menu = menuAdminVisivel(['auditoria', 'painel']); // fora de ordem de propósito
    expect(menu.map((m) => m.href)).toEqual(['/admin/dashboard', '/admin/auditoria']);
  });
  it('conjunto vazio → menu vazio; catálogo completo → todos os itens', () => {
    expect(menuAdminVisivel([])).toHaveLength(0);
    expect(menuAdminVisivel(TELAS_ADMIN.map((t) => t.key))).toHaveLength(TELAS_ADMIN.length);
  });
  it('ignora chaves desconhecidas', () => {
    expect(menuAdminVisivel(['inexistente', 'malote']).map((m) => m.href)).toEqual(['/admin/malote']);
  });
});

describe('homeAdmin — home do papel no Painel Admin', () => {
  it('retorna a href da primeira tela visível (ordem do catálogo)', () => {
    expect(homeAdmin(['auditoria', 'painel'])).toBe('/admin/dashboard'); // painel vem antes no catálogo
    expect(homeAdmin(['auditoria'])).toBe('/admin/auditoria');
  });
  it('cai no dashboard quando não há telas conhecidas ou o cache é nulo', () => {
    expect(homeAdmin([])).toBe('/admin/dashboard');
    expect(homeAdmin(null)).toBe('/admin/dashboard');
  });
});
