import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { startListingExpiryJob, stopListingExpiryJob } from './jobs/listingExpiryJob';

async function bootstrap() {
  startListingExpiryJob();

  const httpServer = createServer(app);

  httpServer.listen(env.PORT, () => {
    console.log(`🚀 AGAINO API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await stopListingExpiryJob();
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
