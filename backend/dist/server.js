"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const listingExpiryJob_1 = require("./jobs/listingExpiryJob");
async function bootstrap() {
    (0, listingExpiryJob_1.startListingExpiryJob)();
    const httpServer = (0, http_1.createServer)(app_1.default);
    httpServer.listen(env_1.env.PORT, () => {
        console.log(`🚀 AGAINO API running on port ${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
    });
    const shutdown = async (signal) => {
        console.log(`\n${signal} received — shutting down gracefully`);
        httpServer.close(async () => {
            await (0, listingExpiryJob_1.stopListingExpiryJob)();
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