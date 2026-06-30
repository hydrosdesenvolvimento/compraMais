import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';

/**
 * Bootstrap do servidor: cria a app, sobe a porta e configura
 * graceful shutdown para encerrar o pool de conexoes corretamente.
 */
async function start(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'Encerrando servidor...');
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Erro no shutdown');
      process.exit(1);
    }
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (err) {
    app.log.error({ err }, 'Falha ao iniciar o servidor');
    process.exit(1);
  }
}

void start();
