import { Document, Schema, Model, model, Types } from 'mongoose';

export interface IWishlistEntry extends Document {
  userId: Types.ObjectId;
  listingId: Types.ObjectId;
  createdAt: Date;
}

const WishlistEntrySchema = new Schema<IWishlistEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

WishlistEntrySchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const WishlistEntry: Model<IWishlistEntry> = model<IWishlistEntry>(
  'WishlistEntry',
  WishlistEntrySchema,
);
