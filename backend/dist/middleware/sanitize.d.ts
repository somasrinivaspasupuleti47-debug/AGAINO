import { Request, Response, NextFunction } from 'express';
/**
 * Middleware that recursively sanitizes all string fields in req.body
 * using the xss package to prevent XSS attacks.
 */
export declare function sanitizeBody(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=sanitize.d.ts.map