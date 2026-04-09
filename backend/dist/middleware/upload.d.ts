import { Request, Response, NextFunction } from 'express';
export declare const uploadImages: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Reads the first bytes of each uploaded file buffer and validates the MIME
 * type against known magic byte signatures.
 *
 * Accepted formats:
 *   JPEG  — FF D8 FF
 *   PNG   — 89 50 4E 47
 *   WebP  — 52 49 46 46 (RIFF) + bytes 8-11 = 57 45 42 50 (WEBP)
 *
 * Returns 415 if any file has an invalid MIME type.
 */
declare function isValidImageBuffer(buf: Buffer): boolean;
export declare function validateImageMimeTypes(req: Request, res: Response, next: NextFunction): void;
/**
 * Error handler for Multer errors — must be placed after uploadImages in the
 * middleware chain.
 */
export declare function handleUploadErrors(err: unknown, req: Request, res: Response, next: NextFunction): void;
export { isValidImageBuffer };
//# sourceMappingURL=upload.d.ts.map