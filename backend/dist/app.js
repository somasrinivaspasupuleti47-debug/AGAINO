"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalRateLimiter = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const AppError_1 = require("./utils/AppError");
const app = (0, express_1.default)();
// ── Security headers ──────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:', 'http:'],
            connectSrc: ["'self'", env_1.env.FRONTEND_URL],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: env_1.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ── Global rate limiter stub (100 req/min per IP) ─────────────────────────────
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(exports.globalRateLimiter);
// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
// ── API v1 router ─────────────────────────────────────────────────────────────
app.use('/api/v1', routes_1.apiV1Router);
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({ status: err.status, message: err.message });
        return;
    }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
});
exports.default = app;
//# sourceMappingURL=app.js.map