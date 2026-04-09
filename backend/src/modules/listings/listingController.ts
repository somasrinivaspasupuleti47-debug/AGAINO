import { Request, Response, NextFunction } from 'express';
import {
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  publishListing,
  markSold,
  getPublicFeed,
  getListingById,
  createListingSchema,
  updateListingSchema,
} from './listingService';
import { AppError } from '../../utils/AppError';

export async function handleCreateListing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const sellerId = req.user!.userId;
    const listing = await createListing(sellerId, parsed.data);
    res.status(201).json({ status: 'success', data: listing });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateListing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ status: 'fail', errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const sellerId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';
    const listing = await updateListing(req.params.id, sellerId, parsed.data, isAdmin);
    res.json({ status: 'success', data: listing });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteListing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.user!.userId;
    await deleteListing(req.params.id, sellerId);
    res.json({ status: 'success', message: 'Listing permanently deleted' });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMyListings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.user!.userId;
    const listings = await getMyListings(sellerId);
    res.json({ status: 'success', data: listings });
  } catch (err) {
    next(err);
  }
}

export async function handlePublishListing(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.user!.userId;
    const listing = await publishListing(req.params.id, sellerId);
    res.json({ status: 'success', data: listing });
  } catch (err) {
    next(err);
  }
}

export async function handleMarkSold(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = req.user!.userId;
    const listing = await markSold(req.params.id, sellerId);
    res.json({ status: 'success', data: listing });
  } catch (err) {
    next(err);
  }
}

export async function handleGetPublicFeed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const result = await getPublicFeed(page, limit);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleGetListingById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const listing = await getListingById(req.params.id);
    res.json({ status: 'success', data: listing });
  } catch (err) {
    next(err);
  }
}

// ── Error handler for AppError ────────────────────────────────────────────────

export async function handleUploadImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ status: 'fail', message: 'At least 1 image is required' });
      return;
    }
    if (files.length > 5) {
      res.status(400).json({ status: 'fail', message: 'Maximum 5 images allowed' });
      return;
    }

    const { Listing } = await import('./models/Listing');
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      res.status(404).json({ status: 'fail', message: 'Listing not found' });
      return;
    }

    // Only the owner can upload images
    if (listing.sellerId.toString() !== req.user!.userId) {
      res.status(403).json({ status: 'fail', message: 'Forbidden' });
      return;
    }

    const { processAndSaveImages } = await import('../../services/imageService');
    const processed = await processAndSaveImages(files);

    await Listing.findByIdAndUpdate(req.params.id, { images: processed });

    res.json({ status: 'success', data: processed });
  } catch (err) {
    next(err);
  }
}

export async function handleDirectUploadImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ status: 'fail', message: 'At least 1 image is required' });
      return;
    }
    if (files.length > 5) {
      res.status(400).json({ status: 'fail', message: 'Maximum 5 images allowed' });
      return;
    }
    const { processAndSaveImages } = await import('../../services/imageService');
    const processed = await processAndSaveImages(files);
    res.json({ status: 'success', data: processed });
  } catch (err) {
    next(err);
  }
}

export function listingErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
    return;
  }
  next(err);
}
