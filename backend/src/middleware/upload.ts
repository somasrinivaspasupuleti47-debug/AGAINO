import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// ── Multer configuration ──────────────────────────────────────────────────────

const storage = multer.memoryStorage();

const limits = {
  fileSize: 5 * 1024 * 1024, // 5 MB per file
  files: 10, // max 10 files
};

export const uploadImages = multer({ storage, limits }).array('images', 10);

// ── Magic byte MIME validation ────────────────────────────────────────────────

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
function isValidImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;

  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50 // WEBP
  )
    return true;

  return false;
}

export function validateImageMimeTypes(req: Request, res: Response, next: NextFunction): void {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    return next();
  }

  for (const file of files) {
    if (!isValidImageBuffer(file.buffer)) {
      return next(
        new AppError('Unsupported image format. Only JPEG, PNG, and WebP are allowed.', 415),
      );
    }
  }

  next();
}

/**
 * Error handler for Multer errors — must be placed after uploadImages in the
 * middleware chain.
 */
export function handleUploadErrors(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 5 MB per file.', 413));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 files per upload.', 413));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  }
  next(err);
}

// Re-export the validation helper for use in tests
export { isValidImageBuffer };
