"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImages = void 0;
exports.validateImageMimeTypes = validateImageMimeTypes;
exports.handleUploadErrors = handleUploadErrors;
exports.isValidImageBuffer = isValidImageBuffer;
const multer_1 = __importStar(require("multer"));
const AppError_1 = require("../utils/AppError");
// ── Multer configuration ──────────────────────────────────────────────────────
const storage = multer_1.default.memoryStorage();
const limits = {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10, // max 10 files
};
exports.uploadImages = (0, multer_1.default)({ storage, limits }).array('images', 10);
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
function isValidImageBuffer(buf) {
    if (buf.length < 12)
        return false;
    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
        return true;
    // PNG: 89 50 4E 47
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
        return true;
    // WebP: RIFF....WEBP
    if (buf[0] === 0x52 &&
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
function validateImageMimeTypes(req, res, next) {
    const files = req.files;
    if (!files || files.length === 0) {
        return next();
    }
    for (const file of files) {
        if (!isValidImageBuffer(file.buffer)) {
            return next(new AppError_1.AppError('Unsupported image format. Only JPEG, PNG, and WebP are allowed.', 415));
        }
    }
    next();
}
/**
 * Error handler for Multer errors — must be placed after uploadImages in the
 * middleware chain.
 */
function handleUploadErrors(err, req, res, next) {
    if (err instanceof multer_1.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError_1.AppError('File too large. Maximum size is 5 MB per file.', 413));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError_1.AppError('Too many files. Maximum is 10 files per upload.', 413));
        }
        return next(new AppError_1.AppError(`Upload error: ${err.message}`, 400));
    }
    next(err);
}
//# sourceMappingURL=upload.js.map