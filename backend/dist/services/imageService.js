"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAndSaveImages = processAndSaveImages;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const uuid_1 = require("uuid");
// ── Directory paths ───────────────────────────────────────────────────────────
const UPLOADS_ROOT = path_1.default.resolve(__dirname, '../../uploads');
const ORIGINALS_DIR = path_1.default.join(UPLOADS_ROOT, 'originals');
const THUMBNAILS_DIR = path_1.default.join(UPLOADS_ROOT, 'thumbnails');
async function ensureDirectories() {
    await promises_1.default.mkdir(ORIGINALS_DIR, { recursive: true });
    await promises_1.default.mkdir(THUMBNAILS_DIR, { recursive: true });
}
/**
 * Processes uploaded image files through the Sharp pipeline:
 *  - Resizes to max 1200px width (maintains aspect ratio), converts to WebP → originals/
 *  - Resizes to 300px width, converts to WebP → thumbnails/
 *
 * Returns CDN-style URLs for each processed image.
 */
async function processAndSaveImages(files) {
    await ensureDirectories();
    const results = [];
    for (const file of files) {
        const id = (0, uuid_1.v4)();
        const filename = `${id}.webp`;
        const originalPath = path_1.default.join(ORIGINALS_DIR, filename);
        const thumbnailPath = path_1.default.join(THUMBNAILS_DIR, filename);
        // Original — max 1200px wide, WebP
        await (0, sharp_1.default)(file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp()
            .toFile(originalPath);
        // Thumbnail — 300px wide, WebP
        await (0, sharp_1.default)(file.buffer)
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
//# sourceMappingURL=imageService.js.map