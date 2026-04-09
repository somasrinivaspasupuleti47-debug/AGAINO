"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrSet = getOrSet;
const redis_1 = require("../config/redis");
/**
 * Cache-aside helper.
 * Tries to GET the value from Redis; on miss, calls fetchFn(), stores the
 * result with EX ttlSeconds, and returns it.
 */
async function getOrSet(key, ttlSeconds, fetchFn) {
    const redis = (0, redis_1.getRedisClient)();
    const cached = await redis.get(key);
    if (cached !== null) {
        return JSON.parse(cached);
    }
    const value = await fetchFn();
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
}
//# sourceMappingURL=cache.js.map