import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { verifyMailer } from './lib/mailer.js';
import { initSocket } from './socket.js';

async function main() {
  await prisma.$connect();
  if (env.isProd) await verifyMailer();
  else void verifyMailer();

  const app = createApp();
  const server = http.createServer(app);

  // Initialize real-time Socket.IO
  initSocket(server, env.corsOrigins);

  server.listen(env.PORT, () => {
    console.info(`🚀 ChillyFlakes API listening on :${env.PORT} (${env.NODE_ENV})`);
    console.info(`   CORS origins: ${env.corsOrigins.join(', ')}`);
    console.info(`   Real-time WebSockets enabled`);
  });

  // Purge expired sessions & codes hourly
  const janitor = setInterval(async () => {
    const now = new Date();
    try {
      await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
      await prisma.verificationCode.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } } });
    } catch (err) {
      console.error('[janitor]', (err as Error).message);
    }
  }, 60 * 60_000);

  const shutdown = async (signal: string) => {
    console.info(`\n${signal} received — shutting down gracefully…`);
    clearInterval(janitor);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (err) => {
  console.error('❌ Failed to start API:', err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
