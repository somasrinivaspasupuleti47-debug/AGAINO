import { Document, Schema, Model, model, Types } from 'mongoose';

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

const ListingSchema = new Schema<IListing>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true },
    condition: { type: String, enum: ['new', 'used'], required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'sold', 'archived'],
      default: 'draft',
      required: true,
    },
    isFeatured: { type: Boolean, default: false, required: true, index: true },
    images: [
      {
        original: { type: String, required: true },
        thumbnail: { type: String, required: true },
      },
    ],
    location: {
      city: { type: String, required: true },
      region: { type: String, required: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    expiresAt: { type: Date },
    viewCount: { type: Number, default: 0, required: true },
  },
  { timestamps: true },
);

ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ category: 1, status: 1 });
ListingSchema.index({ 'location.coordinates': '2dsphere' });
ListingSchema.index({ title: 'text', description: 'text' });

export const Listing: Model<IListing> = model<IListing>('Listing', ListingSchema);
