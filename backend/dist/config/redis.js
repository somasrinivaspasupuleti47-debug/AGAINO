"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let redisClient = null;
function getRedisClient() {
    if (redisClient)
        return redisClient;
    redisClient = new ioredis_1.default(env_1.env.REDIS_URL, {
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
async function connectRedis() {
    const client = getRedisClient();
    // Only connect if not already connected or connecting
    if (client.status === 'wait' || client.status === 'close' || client.status === 'end') {
        await client.connect();
    }
}
async function disconnectRedis() {
    if (!redisClient)
        return;
    await redisClient.quit();
    redisClient = null;
    console.log('Redis disconnected');
}
//# sourceMappingURL=redis.js.map