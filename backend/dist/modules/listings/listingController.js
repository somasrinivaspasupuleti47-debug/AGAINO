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
exports.handleCreateListing = handleCreateListing;
exports.handleUpdateListing = handleUpdateListing;
exports.handleDeleteListing = handleDeleteListing;
exports.handleGetMyListings = handleGetMyListings;
exports.handlePublishListing = handlePublishListing;
exports.handleMarkSold = handleMarkSold;
exports.handleGetPublicFeed = handleGetPublicFeed;
exports.handleGetListingById = handleGetListingById;
exports.handleUploadImages = handleUploadImages;
exports.listingErrorHandler = listingErrorHandler;
const listingService_1 = require("./listingService");
const AppError_1 = require("../../utils/AppError");
async function handleCreateListing(req, res, next) {
    try {
        const parsed = listingService_1.createListingSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const sellerId = req.user.userId;
        const listing = await (0, listingService_1.createListing)(sellerId, parsed.data);
        res.status(201).json({ status: 'success', data: listing });
    }
    catch (err) {
        next(err);
    }
}
async function handleUpdateListing(req, res, next) {
    try {
        const parsed = listingService_1.updateListingSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const sellerId = req.user.userId;
        const isAdmin = req.user.role === 'admin';
        const listing = await (0, listingService_1.updateListing)(req.params.id, sellerId, parsed.data, isAdmin);
        res.json({ status: 'success', data: listing });
    }
    catch (err) {
        next(err);
    }
}
async function handleDeleteListing(req, res, next) {
    try {
        const sellerId = req.user.userId;
        await (0, listingService_1.deleteListing)(req.params.id, sellerId);
        res.json({ status: 'success', message: 'Listing permanently deleted' });
    }
    catch (err) {
        next(err);
    }
}
async function handleGetMyListings(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const listings = await (0, listingService_1.getMyListings)(sellerId);
        res.json({ status: 'success', data: listings });
    }
    catch (err) {
        next(err);
    }
}
async function handlePublishListing(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const listing = await (0, listingService_1.publishListing)(req.params.id, sellerId);
        res.json({ status: 'success', data: listing });
    }
    catch (err) {
        next(err);
    }
}
async function handleMarkSold(req, res, next) {
    try {
        const sellerId = req.user.userId;
        const listing = await (0, listingService_1.markSold)(req.params.id, sellerId);
        res.json({ status: 'success', data: listing });
    }
    catch (err) {
        next(err);
    }
}
async function handleGetPublicFeed(req, res, next) {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
        const result = await (0, listingService_1.getPublicFeed)(page, limit);
        res.json({ status: 'success', data: result });
    }
    catch (err) {
        next(err);
    }
}
async function handleGetListingById(req, res, next) {
    try {
        const listing = await (0, listingService_1.getListingById)(req.params.id);
        res.json({ status: 'success', data: listing });
    }
    catch (err) {
        next(err);
    }
}
// ── Error handler for AppError ────────────────────────────────────────────────
async function handleUploadImages(req, res, next) {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ status: 'fail', message: 'At least 1 image is required' });
            return;
        }
        if (files.length > 5) {
            res.status(400).json({ status: 'fail', message: 'Maximum 5 images allowed' });
            return;
        }
        const { Listing } = await Promise.resolve().then(() => __importStar(require('./models/Listing')));
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            res.status(404).json({ status: 'fail', message: 'Listing not found' });
            return;
        }
        // Only the owner can upload images
        if (listing.sellerId.toString() !== req.user.userId) {
            res.status(403).json({ status: 'fail', message: 'Forbidden' });
            return;
        }
        const { processAndSaveImages } = await Promise.resolve().then(() => __importStar(require('../../services/imageService')));
        const processed = await processAndSaveImages(files);
        await Listing.findByIdAndUpdate(req.params.id, { images: processed });
        res.json({ status: 'success', data: processed });
    }
    catch (err) {
        next(err);
    }
}
function listingErrorHandler(err, _req, res, next) {
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({ status: err.status, message: err.message });
        return;
    }
    next(err);
}
//# sourceMappingURL=listingController.js.map