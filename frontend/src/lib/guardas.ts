import { redirect } from '@tanstack/react-router';
import { obterUsuario, obterTelasAdmin, ehPapelInterno, salvarTelasAdmin } from './auth';
import { api } from './api';
import { TELAS_ADMIN, type TelaAdminKey } from './telas-admin';

/** Primeira tela admin visível (ordem do catálogo), ou o dashboard como fallback. */
export function homeAdmin(telas: readonly string[] | null): string {
  const primeira = TELAS_ADMIN.find((t) => telas?.includes(t.key));
  return primeira ? (primeira.item.href as string) : '/admin/dashboard';
}

/** Destino pós-login conforme o papel: interno → sua home no Painel Admin; fornecedor → Início. */
export function homeDoPapel(papel: string | undefined, telas: readonly string[] | null): string {
  return ehPapelInterno(papel) ? homeAdmin(telas) : '/inicio';
}

/**
 * Guarda de rota do Painel Admin (beforeLoad). Enforça "telas por perfil" para sessões autenticadas:
 * - anônimo/demo (sem sessão): passa — o RBAC do backend é a salvaguarda real dos dados;
 * - fornecedor (titular/procurador): não acessa o admin → volta ao Início;
 * - papéis internos (inclusive administrador): só as telas visíveis ao papel (cache local); do
 *   contrário, vai à sua home admin. O administrador sempre mantém `perfis` (anti-lockout no backend).
 */
export function exigirTelaAdmin(tela: TelaAdminKey): void {
  const u = obterUsuario();
  if (!u) return;
  if (!ehPapelInterno(u.papel)) throw redirect({ to: '/inicio' });
  const telas = obterTelasAdmin();
  if (telas && !telas.includes(tela)) throw redirect({ to: homeAdmin(telas) });
}

/** Guarda das telas exclusivas do Titular no portal do fornecedor (Procuradores/Privacidade — UC019/UC017). */
export function exigirTitular(): void {
  const u = obterUsuario();
  if (u?.papel === 'procurador') throw redirect({ to: '/inicio' });
}

/**
 * Destino pós-login: servidor interno vai para a sua home no Painel Admin (primeira tela visível,
 * buscada e cacheada agora); fornecedor (titular/procurador) vai para o Início. Em falha ao buscar as
 * telas, cai no dashboard (o guard corrige se aquele papel não o enxergar).
 */
export async function destinoAposLogin(): Promise<string> {
  const u = obterUsuario();
  if (!ehPapelInterno(u?.papel)) return '/inicio';
  try {
    const r = await api.telasVisiveis();
    salvarTelasAdmin(r.telas);
    return homeAdmin(r.telas);
  } catch {
    return '/admin/dashboard';
  }
}
