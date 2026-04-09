import { Document, Model, Types } from 'mongoose';
export interface IWishlistEntry extends Document {
    userId: Types.ObjectId;
    listingId: Types.ObjectId;
    createdAt: Date;
}
export declare const WishlistEntry: Model<IWishlistEntry>;
//# sourceMappingURL=WishlistEntry.d.ts.map