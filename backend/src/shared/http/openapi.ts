import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Adaptador de documentação de API (camada de infra). Gera o contrato OpenAPI 3 a partir das rotas
 * Fastify e expõe a UI interativa em `/docs` (JSON em `/docs/json`). Mantém a documentação fora do
 * domínio/casos de uso (Clean Architecture), igual ao hardening de segurança.
 *
 * IMPORTANTE: o `@fastify/swagger` coleta rotas via hook `onRoute`, que precisa estar ativo ANTES do
 * registro das rotas. Por isso o registro é AGUARDADO (await) — garantindo o hook instalado — e este
 * adaptador é chamado no composition root logo após o hardening e ANTES de qualquer rota.
 */
export async function registrarDocsApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'compraMais API',
        description:
          'API do compraMais (Fastify). Monólito modular / Clean Architecture — contextos: catálogo, ' +
          'credenciamento, editais, auditoria, malote, titular e painéis.',
        version: '0.1.0',
      },
      tags: [
        { name: 'saude', description: 'Liveness e métricas operacionais' },
        { name: 'autenticacao', description: 'Login local (e-mail/senha + JWT) e Google OAuth (008)' },
        { name: 'catalogo', description: 'Onboarding e conta do fornecedor (001)' },
        { name: 'credenciamento', description: 'Documentos, covalidação, elegibilidade e prova de vida/liveness (002 / UC007)' },
        { name: 'editais', description: 'Editais individualizados e contestação de CNAE (003)' },
        { name: 'auditoria', description: 'Trilha de auditoria — consulta e exportação (004)' },
        { name: 'malote', description: 'Malote SEI — geração e exportação (005)' },
        { name: 'titular', description: 'Direitos do titular / LGPD (006)' },
        { name: 'paineis', description: 'Dashboards e transparência (007)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
}
