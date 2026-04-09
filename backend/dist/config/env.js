"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    // Database
    MONGODB_URI: zod_1.z.string().min(1, 'MONGODB_URI is required'),
    // Redis
    REDIS_URL: zod_1.z.string().min(1, 'REDIS_URL is required'),
    // JWT
    ACCESS_TOKEN_SECRET: zod_1.z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
    REFRESH_TOKEN_SECRET: zod_1.z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
    // Google OAuth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    // SMTP
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(465),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    // Admin
    ADMIN_EMAIL: zod_1.z.string().email().default('somasrinivaspasupuleti47@gmail.com'),
    // Cloud Storage
    CLOUD_STORAGE_BUCKET: zod_1.z.string().optional(),
    CDN_BASE_URL: zod_1.z.string().optional(),
    // App
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    CSRF_SECRET: zod_1.z.string().min(32).optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map