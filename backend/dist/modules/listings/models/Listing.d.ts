import { Document, Model, Types } from 'mongoose';
interface IListingImage {
    original: string;
    thumbnail: string;
}
interface IListingCoordinates {
    type: 'Point';
    coordinates: [number, number];
}
interface IListingLocation {
    city: string;
    region: string;
    coordinates?: IListingCoordinates;
}
export interface IListing extends Document {
    sellerId: Types.ObjectId;
    title: string;
    description: string;
    price: number;
    category: string;
    subcategory: string;
    condition: 'new' | 'used';
    status: 'draft' | 'published' | 'sold' | 'archived';
    isFeatured: boolean;
    images: IListingImage[];
    location: IListingLocation;
    expiresAt?: Date;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Listing: Model<IListing>;
export {};
//# sourceMappingURL=Listing.d.ts.map