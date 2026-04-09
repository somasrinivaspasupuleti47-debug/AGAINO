import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockReq(body: unknown = {}): Partial<Request> {
  return { body } as Partial<Request>;
}

function mockRes(): { status: jest.Mock; json: jest.Mock; res: Partial<Response> } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Partial<Response>;
  return { status, json, res };
}

const mockNext: NextFunction = jest.fn();

// ── validate middleware ───────────────────────────────────────────────────────

import { validate } from '../src/middleware/validate';

describe('validate middleware', () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(0),
  });

  beforeEach(() => {
    (mockNext as jest.Mock).mockClear();
  });

  it('calls next() when body matches schema', () => {
    const req = mockReq({ email: 'user@example.com', age: 25 });
    const { res } = mockRes();
    validate(schema)(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('returns 400 with field errors when body is invalid', () => {
    const req = mockReq({ email: 'not-an-email', age: -1 });
    const { status, json } = mockRes();
    const res = { status, json } as unknown as Response;
    validate(schema)(req as Request, res, mockNext);

    expect(status).toHaveBeenCalledWith(400);
    const body = status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.status).toBe('fail');
    expect(body.errors).toBeDefined();
    expect(body.errors.email).toBeDefined();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 400 with per-field errors for each invalid field', () => {
    const req = mockReq({ email: 'bad', age: 'notanumber' });
    const { status } = mockRes();
    const res = { status, json: jest.fn() } as unknown as Response;
    validate(schema)(req as Request, res, mockNext);

    expect(status).toHaveBeenCalledWith(400);
    const body = status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.errors.email).toBeDefined();
    expect(body.errors.age).toBeDefined();
  });

  it('returns 400 when required fields are missing', () => {
    const req = mockReq({});
    const { status } = mockRes();
    const res = { status, json: jest.fn() } as unknown as Response;
    validate(schema)(req as Request, res, mockNext);

    expect(status).toHaveBeenCalledWith(400);
    const body = status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.status).toBe('fail');
    expect(body.errors.email).toBeDefined();
    expect(body.errors.age).toBeDefined();
  });

  it('replaces req.body with parsed (coerced) data on success', () => {
    const coercingSchema = z.object({ count: z.coerce.number() });
    const req = mockReq({ count: '42' });
    const { res } = mockRes();
    validate(coercingSchema)(req as Request, res as Response, mockNext);
    expect((req as Request).body.count).toBe(42);
  });
});

// ── sanitizeBody middleware ───────────────────────────────────────────────────

import { sanitizeBody } from '../src/middleware/sanitize';

describe('sanitizeBody middleware', () => {
  beforeEach(() => {
    (mockNext as jest.Mock).mockClear();
  });

  it('strips script tags from string fields', () => {
    const req = mockReq({ name: '<script>alert("xss")</script>Hello' });
    const { res } = mockRes();
    sanitizeBody(req as Request, res as Response, mockNext);
    expect((req as Request).body.name).not.toContain('<script>');
    expect((req as Request).body.name).toContain('Hello');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('sanitizes nested object string fields', () => {
    const req = mockReq({ user: { bio: '<img src=x onerror=alert(1)>text' } });
    const { res } = mockRes();
    sanitizeBody(req as Request, res as Response, mockNext);
    expect((req as Request).body.user.bio).not.toContain('onerror');
    expect((req as Request).body.user.bio).toContain('text');
  });

  it('sanitizes strings inside arrays', () => {
    const req = mockReq({ tags: ['<b>ok</b>', '<script>bad</script>'] });
    const { res } = mockRes();
    sanitizeBody(req as Request, res as Response, mockNext);
    const tags = (req as Request).body.tags as string[];
    expect(tags[0]).toContain('ok');
    expect(tags[1]).not.toContain('<script>');
  });

  it('leaves non-string values untouched', () => {
    const req = mockReq({ count: 42, active: true, data: null });
    const { res } = mockRes();
    sanitizeBody(req as Request, res as Response, mockNext);
    expect((req as Request).body.count).toBe(42);
    expect((req as Request).body.active).toBe(true);
    expect((req as Request).body.data).toBeNull();
  });

  it('calls next() when body is empty', () => {
    const req = mockReq({});
    const { res } = mockRes();
    sanitizeBody(req as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});

// ── publicRateLimiter — 429 behaviour ─────────────────────────────────────────
// express-rate-limit is mocked so we can test the 429 response without
// spinning up a real HTTP server or waiting for real time windows.

jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options: { max: number; message: unknown }) => {
    let callCount = 0;
    return (_req: Request, res: Response, next: NextFunction) => {
      callCount += 1;
      if (callCount > options.max) {
        res.status(429).json(options.message);
        return;
      }
      next();
    };
  });
});

import { publicRateLimiter, authRateLimiter } from '../src/middleware/rateLimiter';

describe('publicRateLimiter', () => {
  it('allows requests up to the limit', () => {
    const req = {} as Request;
    const { res } = mockRes();
    const next = jest.fn() as unknown as NextFunction;
    publicRateLimiter(req, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 429 after exceeding 100 requests', () => {
    // Each import of publicRateLimiter shares the same closure counter.
    // We need a fresh instance — re-require after clearing the module cache.
    jest.resetModules();
    // Re-apply the mock for the fresh require
    jest.mock('express-rate-limit', () =>
      jest.fn().mockImplementation((options: { max: number; message: unknown }) => {
        let count = 0;
        return (_req: Request, res: Response, next: NextFunction) => {
          count += 1;
          if (count > options.max) {
            res.status(429).json(options.message);
            return;
          }
          next();
        };
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { publicRateLimiter: freshLimiter } = require('../src/middleware/rateLimiter');
    const req = {} as Request;
    const next = jest.fn() as unknown as NextFunction;

    // Exhaust the 100-request window
    for (let i = 0; i < 100; i++) {
      const { res } = mockRes();
      freshLimiter(req, res as Response, next);
    }

    // 101st request should be rejected
    const { status, json } = mockRes();
    const res101 = { status, json } as unknown as Response;
    freshLimiter(req, res101, next);

    expect(status).toHaveBeenCalledWith(429);
  });
});

describe('authRateLimiter', () => {
  it('returns 429 after exceeding 10 requests', () => {
    jest.resetModules();
    jest.mock('express-rate-limit', () =>
      jest.fn().mockImplementation((options: { max: number; message: unknown }) => {
        let count = 0;
        return (_req: Request, res: Response, next: NextFunction) => {
          count += 1;
          if (count > options.max) {
            res.status(429).json(options.message);
            return;
          }
          next();
        };
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { authRateLimiter: freshLimiter } = require('../src/middleware/rateLimiter');
    const req = {} as Request;
    const next = jest.fn() as unknown as NextFunction;

    for (let i = 0; i < 10; i++) {
      const { res } = mockRes();
      freshLimiter(req, res as Response, next);
    }

    const { status, json } = mockRes();
    const res11 = { status, json } as unknown as Response;
    freshLimiter(req, res11, next);

    expect(status).toHaveBeenCalledWith(429);
  });
});
