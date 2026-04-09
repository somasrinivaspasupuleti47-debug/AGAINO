export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    MONGODB_URI: string;
    REDIS_URL: string;
    ACCESS_TOKEN_SECRET: string;
    REFRESH_TOKEN_SECRET: string;
    SMTP_PORT: number;
    ADMIN_EMAIL: string;
    FRONTEND_URL: string;
    GOOGLE_CLIENT_ID?: string | undefined;
    GOOGLE_CLIENT_SECRET?: string | undefined;
    SMTP_HOST?: string | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
    CLOUD_STORAGE_BUCKET?: string | undefined;
    CDN_BASE_URL?: string | undefined;
    CSRF_SECRET?: string | undefined;
};
export type Env = typeof env;
//# sourceMappingURL=env.d.ts.map