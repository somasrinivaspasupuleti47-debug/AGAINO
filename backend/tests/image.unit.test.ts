/**
 * Unit tests for the Sharp image processing pipeline.
 *
 * Tests:
 *  - Sharp is called with correct resize params (1200px original, 300px thumbnail)
 *  - WebP conversion is applied to both outputs
 *  - Unique filenames (UUIDs) are generated for each file
 *
 * _Requirements: 5.4, 15.4_
 */

// ── Mock sharp ────────────────────────────────────────────────────────────────

const mockToFile = jest.fn().mockResolvedValue({ size: 1024 });
const mockWebp = jest.fn().mockReturnThis();
const mockResize = jest.fn().mockReturnThis();

const mockSharpInstance = {
  resize: mockResize,
  webp: mockWebp,
  toFile: mockToFile,
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

// ── Mock fs/promises (avoid real disk I/O) ────────────────────────────────────

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock uuid to produce predictable values ───────────────────────────────────

let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `test-uuid-${++uuidCounter}`),
}));

import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { processAndSaveImages } from '../src/services/imageService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name = 'test.jpg'): Express.Multer.File {
  return {
    fieldname: 'images',
    originalname: name,
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  uuidCounter = 0;
  // Restore chainable mock after clearAllMocks
  mockResize.mockReturnThis();
  mockWebp.mockReturnThis();
  mockToFile.mockResolvedValue({ size: 1024 });
});

describe('processAndSaveImages — resize dimensions', () => {
  it('calls sharp resize with width 1200 for the original', async () => {
    const file = makeFile();
    await processAndSaveImages([file]);

    // First resize call → original (1200px)
    expect(mockResize).toHaveBeenNthCalledWith(1, { width: 1200, withoutEnlargement: true });
  });

  it('calls sharp resize with width 300 for the thumbnail', async () => {
    const file = makeFile();
    await processAndSaveImages([file]);

    // Second resize call → thumbnail (300px)
    expect(mockResize).toHaveBeenNthCalledWith(2, { width: 300, withoutEnlargement: true });
  });

  it('processes both original and thumbnail for each file', async () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg')];
    await processAndSaveImages(files);

    // 2 files × 2 passes (original + thumbnail) = 4 sharp() calls
    expect(sharp).toHaveBeenCalledTimes(4);
    expect(mockResize).toHaveBeenCalledTimes(4);
  });
});

describe('processAndSaveImages — WebP conversion', () => {
  it('applies .webp() conversion for the original', async () => {
    await processAndSaveImages([makeFile()]);
    // webp() called twice (original + thumbnail)
    expect(mockWebp).toHaveBeenCalledTimes(2);
  });

  it('applies .webp() conversion for the thumbnail', async () => {
    const files = [makeFile('x.png'), makeFile('y.png')];
    await processAndSaveImages(files);
    // 2 files × 2 = 4 webp() calls
    expect(mockWebp).toHaveBeenCalledTimes(4);
  });

  it('output filenames end with .webp extension', async () => {
    await processAndSaveImages([makeFile()]);

    const calls = mockToFile.mock.calls;
    expect(calls.length).toBe(2);
    calls.forEach(([filePath]: [string]) => {
      expect(filePath).toMatch(/\.webp$/);
    });
  });
});

describe('processAndSaveImages — unique filenames', () => {
  it('generates a unique UUID filename for each file', async () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')];
    const results = await processAndSaveImages(files);

    const originalPaths = results.map((r) => r.original);
    const uniquePaths = new Set(originalPaths);
    expect(uniquePaths.size).toBe(files.length);
  });

  it('uuid is called once per file (shared between original and thumbnail)', async () => {
    const files = [makeFile(), makeFile()];
    await processAndSaveImages(files);

    // uuidv4 called once per file
    expect(uuidv4).toHaveBeenCalledTimes(files.length);
  });

  it('returned URLs follow the /uploads/originals/ and /uploads/thumbnails/ pattern', async () => {
    const results = await processAndSaveImages([makeFile()]);

    expect(results[0].original).toMatch(/^\/uploads\/originals\/.+\.webp$/);
    expect(results[0].thumbnail).toMatch(/^\/uploads\/thumbnails\/.+\.webp$/);
  });

  it('original and thumbnail share the same UUID filename', async () => {
    const results = await processAndSaveImages([makeFile()]);

    const originalFile = results[0].original.split('/').pop();
    const thumbnailFile = results[0].thumbnail.split('/').pop();
    expect(originalFile).toBe(thumbnailFile);
  });
});

describe('processAndSaveImages — return value structure', () => {
  it('returns an array with one entry per input file', async () => {
    const files = [makeFile(), makeFile(), makeFile()];
    const results = await processAndSaveImages(files);
    expect(results).toHaveLength(3);
  });

  it('each result has original and thumbnail string properties', async () => {
    const results = await processAndSaveImages([makeFile()]);
    expect(typeof results[0].original).toBe('string');
    expect(typeof results[0].thumbnail).toBe('string');
  });

  it('returns empty array for empty input', async () => {
    const results = await processAndSaveImages([]);
    expect(results).toEqual([]);
  });
});
