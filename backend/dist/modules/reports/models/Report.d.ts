import { Document, Model, Types } from 'mongoose';
export interface IReport extends Document {
    listingId: Types.ObjectId;
    reporterId: Types.ObjectId;
    reason: 'spam' | 'fraud' | 'inappropriate' | 'duplicate' | 'other';
    description?: string;
    status: 'pending' | 'reviewed' | 'dismissed';
    createdAt: Date;
}
export declare const Report: Model<IReport>;
//# sourceMappingURL=Report.d.ts.map