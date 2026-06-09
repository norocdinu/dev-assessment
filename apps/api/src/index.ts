import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

// Graceful shutdown so in-flight requests finish during Render redeploys.
const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down…`);
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
