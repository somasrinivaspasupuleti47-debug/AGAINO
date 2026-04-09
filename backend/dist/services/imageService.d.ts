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
export declare function processAndSaveImages(files: Express.Multer.File[]): Promise<ProcessedImage[]>;
//# sourceMappingURL=imageService.d.ts.map