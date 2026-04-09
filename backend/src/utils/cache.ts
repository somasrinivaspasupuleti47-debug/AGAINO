import { getRedisClient } from '../config/redis';

/**
 * Cache-aside helper.
 * Tries to GET the value from Redis; on miss, calls fetchFn(), stores the
 * result with EX ttlSeconds, and returns it.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const redis = getRedisClient();

  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const value = await fetchFn();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}
