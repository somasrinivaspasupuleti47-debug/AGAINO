import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// ── Directory paths ───────────────────────────────────────────────────────────

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const ORIGINALS_DIR = path.join(UPLOADS_ROOT, 'originals');
const THUMBNAILS_DIR = path.join(UPLOADS_ROOT, 'thumbnails');

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
}

// ── Image processing ──────────────────────────────────────────────────────────

export interface ProcessedImage {
  original: string;
  thumbnail: string;
}

/**
 * Processes uploaded image files through the Sharp pipeline:
 *  - Resizes to max 1200px width (maintains aspect ratio), converts to WebP → originals/
 *  - Resizes to 300px width, converts to WebP → thumbnails/
 *
 * Returns CDN-style URLs for each processed image.
 */
export async function processAndSaveImages(
  files: Express.Multer.File[],
): Promise<ProcessedImage[]> {
  await ensureDirectories();

  const results: ProcessedImage[] = [];

  for (const file of files) {
    const id = uuidv4();
    const filename = `${id}.webp`;

    const originalPath = path.join(ORIGINALS_DIR, filename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, filename);

    // Original — max 1200px wide, WebP
    await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp()
      .toFile(originalPath);

    // Thumbnail — 300px wide, WebP
    await sharp(file.buffer)
      .resize({ width: 300, withoutEnlargement: true })
      .webp()
      .toFile(thumbnailPath);

    results.push({
      original: `/uploads/originals/${filename}`,
      thumbnail: `/uploads/thumbnails/${filename}`,
    });
  }

  return results;
}
