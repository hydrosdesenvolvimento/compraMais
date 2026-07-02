import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import type { AutenticarGoogle } from '../identity/autenticacao.js';
import type { GoogleConfig } from '../config/env.js';

interface OAuth2Token { token: { access_token: string } }
interface OAuth2Namespace { getAccessTokenFromAuthorizationCodeFlow(req: FastifyRequest): Promise<OAuth2Token> }
interface PerfilGoogle { sub: string; email: string; name?: string }

/**
 * Fluxo OAuth 2.0 / OIDC (Authorization Code) do Google. Registra:
 *   - GET /auth/google           → redireciona ao consentimento do Google;
 *   - GET /auth/google/callback  → troca o `code` por token, lê o perfil (userinfo OIDC),
 *                                  resolve/loga o usuário (vincula ou auto-provisiona) e redireciona
 *                                  ao frontend com o JWT no fragmento.
 * Só é montado quando há credenciais configuradas (GOOGLE_CLIENT_ID/SECRET).
 */
export function registrarGoogleOAuth(
  app: FastifyInstance,
  google: GoogleConfig,
  deps: { autenticarGoogle: AutenticarGoogle; frontendRedirect: string },
): void {
  // Runtime expõe GOOGLE_CONFIGURATION no plugin; sob NodeNext o tipo do default não o declara.
  const auth = (fastifyOauth2 as unknown as { GOOGLE_CONFIGURATION: fastifyOauth2.ProviderConfiguration }).GOOGLE_CONFIGURATION;
  void app.register(fastifyOauth2, {
    name: 'googleOAuth2',
    scope: ['openid', 'email', 'profile'],
    credentials: {
      client: { id: google.clientId, secret: google.clientSecret },
      auth,
    },
    startRedirectPath: '/auth/google',
    callbackUri: google.callbackUrl,
  });

  app.get('/auth/google/callback', async (req, reply) => {
    const ns = (app as unknown as { googleOAuth2: OAuth2Namespace }).googleOAuth2;
    const { token } = await ns.getAccessTokenFromAuthorizationCodeFlow(req);
    const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!resp.ok) {
      return reply.code(502).send({ codigo: 'GOOGLE_USERINFO_FALHOU', mensagem: 'Could not retrieve the Google profile.' });
    }
    const perfil = (await resp.json()) as PerfilGoogle;
    const out = await deps.autenticarGoogle.executar({ googleId: perfil.sub, email: perfil.email, nome: perfil.name ?? perfil.email });
    const sep = deps.frontendRedirect.includes('?') ? '&' : '?';
    return reply.redirect(`${deps.frontendRedirect}${sep}token=${encodeURIComponent(out.token)}`);
  });
}
