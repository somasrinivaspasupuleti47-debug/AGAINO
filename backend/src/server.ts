import { createServer } from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { env } from './config/env';
import { startListingExpiryJob, stopListingExpiryJob } from './jobs/listingExpiryJob';
import { startEmailWorker } from './jobs/emailWorker';

async function bootstrap() {
  await connectDatabase();
  await connectRedis();

  startListingExpiryJob();
  startEmailWorker();

  const httpServer = createServer(app);

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 AGAINO API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      const { disconnectDatabase } = await import('./config/database');
      const { disconnectRedis } = await import('./config/redis');
      await stopListingExpiryJob();
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
