import { JwtTokenService } from '../../src/shared/identity/token-service.js';
import { loadConfig } from '../../src/shared/config/env.js';
import type { Identidade, Papel } from '../../src/shared/identity/identity-provider.js';

/**
 * Emite credenciais REAIS para os testes de rota (AD-20).
 *
 * Usa o mesmo `JwtTokenService` e o mesmo segredo que o `buildServer` — um token forjado aqui é
 * indistinguível de um vindo do `POST /auth/login`. Isto é deliberado: se o teste pudesse se
 * autenticar por um atalho que a produção não tem, ele deixaria de provar o RBAC real, que foi
 * exatamente como o defeito do header `x-papel` sobreviveu a 348 testes verdes.
 */
function servico(): JwtTokenService {
  const config = loadConfig();
  return new JwtTokenService(config.auth.jwtSecret, config.auth.jwtExpiraEmSeg);
}

/** Token assinado para a identidade dada. */
export function tokenPara(id: Identidade): string {
  return servico().emitir(id).token;
}

/**
 * Headers de um chamador autenticado, prontos para `app.inject`.
 * Ex.: `headers: comoPapel('administrador')` · `comoPapel('titular', { empresaId: 'e1' })`
 */
export function comoPapel(
  papel: Papel,
  opts: { userId?: string; empresaId?: string; nome?: string } = {},
): Record<string, string> {
  const token = tokenPara({
    userId: opts.userId ?? `user-${papel}`,
    papel,
    empresaId: opts.empresaId,
    nome: opts.nome,
  });
  return { authorization: `Bearer ${token}` };
}
