import { Request, Response, NextFunction } from 'express';
export declare function handleCreateListing(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleUpdateListing(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleDeleteListing(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetMyListings(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handlePublishListing(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleMarkSold(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetPublicFeed(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleGetListingById(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function handleUploadImages(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listingErrorHandler(err: Error, _req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=listingController.d.ts.map