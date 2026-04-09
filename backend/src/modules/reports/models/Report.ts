import { Document, Schema, Model, model, Types } from 'mongoose';

export interface IReport extends Document {
  listingId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: 'spam' | 'fraud' | 'inappropriate' | 'duplicate' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['spam', 'fraud', 'inappropriate', 'duplicate', 'other'],
      required: true,
    },
    description: { type: String },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed'],
      required: true,
      default: 'pending',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ReportSchema.index({ reporterId: 1, listingId: 1 }, { unique: true });

export const Report: Model<IReport> = model<IReport>('Report', ReportSchema);
