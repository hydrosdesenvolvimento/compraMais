import type { UsuarioRepository } from '../../shared/identity/usuario-repository.js';
import type { AtorInfo, ResolvedorAtores } from '../application/resolvedor-atores.js';

/**
 * Resolve ator(UUID) → nome/papel pelo repositório de usuários de autenticação. SOMENTE LEITURA.
 * Busca em paralelo por id único; ator sem usuário correspondente (ex.: conta removida) fica fora do mapa.
 */
export class ResolvedorAtoresUsuario implements ResolvedorAtores {
  constructor(private readonly usuarios: UsuarioRepository) {}

  async resolver(ids: readonly string[]): Promise<Map<string, AtorInfo>> {
    const mapa = new Map<string, AtorInfo>();
    await Promise.all(ids.map(async (id) => {
      const u = await this.usuarios.porId(id).catch(() => null);
      if (u) mapa.set(id, { nome: u.nome, papel: u.papel });
    }));
    return mapa;
  }
}
