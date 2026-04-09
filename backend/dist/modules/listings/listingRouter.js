"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const listingController_1 = require("./listingController");
const upload_1 = require("../../middleware/upload");
exports.listingRouter = (0, express_1.Router)();
// Public routes — /my must come before /:id to avoid being matched as an ID
exports.listingRouter.get('/', listingController_1.handleGetPublicFeed);
exports.listingRouter.get('/my', auth_1.requireAuth, listingController_1.handleGetMyListings);
exports.listingRouter.get('/:id', listingController_1.handleGetListingById);
// Authenticated routes
exports.listingRouter.post('/', auth_1.requireAuth, listingController_1.handleCreateListing);
exports.listingRouter.patch('/:id', auth_1.requireAuth, listingController_1.handleUpdateListing);
exports.listingRouter.delete('/:id', auth_1.requireAuth, listingController_1.handleDeleteListing);
exports.listingRouter.patch('/:id/publish', auth_1.requireAuth, listingController_1.handlePublishListing);
exports.listingRouter.patch('/:id/sold', auth_1.requireAuth, listingController_1.handleMarkSold);
// Image upload
exports.listingRouter.post('/:id/images', auth_1.requireAuth, upload_1.uploadImages, upload_1.validateImageMimeTypes, upload_1.handleUploadErrors, listingController_1.handleUploadImages);
// Error handler
exports.listingRouter.use(listingController_1.listingErrorHandler);
//# sourceMappingURL=listingRouter.js.map