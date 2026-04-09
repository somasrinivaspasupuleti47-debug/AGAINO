import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  handleCreateListing,
  handleUpdateListing,
  handleDeleteListing,
  handleGetMyListings,
  handlePublishListing,
  handleMarkSold,
  handleGetPublicFeed,
  handleGetListingById,
  handleUploadImages,
  handleDirectUploadImages,
  listingErrorHandler,
} from './listingController';
import { uploadImages, validateImageMimeTypes, handleUploadErrors } from '../../middleware/upload';

export const listingRouter = Router();

// Public routes — /my must come before /:id to avoid being matched as an ID
listingRouter.get('/', handleGetPublicFeed);
listingRouter.get('/my', requireAuth, handleGetMyListings);
listingRouter.get('/:id', handleGetListingById);

// Authenticated routes
listingRouter.post('/', requireAuth, handleCreateListing);
listingRouter.patch('/:id', requireAuth, handleUpdateListing);
listingRouter.delete('/:id', requireAuth, handleDeleteListing);
listingRouter.patch('/:id/publish', requireAuth, handlePublishListing);
listingRouter.patch('/:id/sold', requireAuth, handleMarkSold);

// Image upload
listingRouter.post(
  '/:id/images',
  requireAuth,
  uploadImages,
  validateImageMimeTypes,
  handleUploadErrors,
  handleUploadImages,
);

// Generic upload endpoint that doesn't need DB update
listingRouter.post(
  '/upload',
  uploadImages,
  validateImageMimeTypes,
  handleUploadErrors,
  handleDirectUploadImages,
);

// Error handler
listingRouter.use(listingErrorHandler);
