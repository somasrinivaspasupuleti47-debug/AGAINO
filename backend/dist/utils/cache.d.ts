/**
 * Cache-aside helper.
 * Tries to GET the value from Redis; on miss, calls fetchFn(), stores the
 * result with EX ttlSeconds, and returns it.
 */
export declare function getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=cache.d.ts.map