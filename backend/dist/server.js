"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const env_1 = require("./config/env");
const listingExpiryJob_1 = require("./jobs/listingExpiryJob");
const emailWorker_1 = require("./jobs/emailWorker");
async function bootstrap() {
    await (0, database_1.connectDatabase)();
    await (0, redis_1.connectRedis)();
    (0, listingExpiryJob_1.startListingExpiryJob)();
    (0, emailWorker_1.startEmailWorker)();
    const httpServer = (0, http_1.createServer)(app_1.default);
    httpServer.listen(env_1.env.PORT, () => {
        console.log(`🚀 AGAINO API running on port ${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
    });
    const shutdown = async (signal) => {
        console.log(`\n${signal} received — shutting down gracefully`);
        httpServer.close(async () => {
            const { disconnectDatabase } = await Promise.resolve().then(() => __importStar(require('./config/database')));
            const { disconnectRedis } = await Promise.resolve().then(() => __importStar(require('./config/redis')));
            await (0, listingExpiryJob_1.stopListingExpiryJob)();
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
//# sourceMappingURL=server.js.map