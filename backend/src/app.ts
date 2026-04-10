import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import { apiV1Router } from './routes';
import { AppError } from './utils/AppError';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", env.FRONTEND_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global rate limiter stub (100 req/min per IP) ─────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(globalRateLimiter);

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── API v1 router ─────────────────────────────────────────────────────────────
app.use('/api/v1', apiV1Router);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
    return;
  }
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

export default app;
