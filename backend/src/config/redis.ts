import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  redisClient.on('close', () => {
    console.warn('⚠️  Redis connection closed');
  });

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  // Only connect if not already connected or connecting
  if (client.status === 'wait' || client.status === 'close' || client.status === 'end') {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) return;
  await redisClient.quit();
  redisClient = null;
  console.log('Redis disconnected');
}
