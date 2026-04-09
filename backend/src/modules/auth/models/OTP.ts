import { Document, Schema, Model, model, Types } from 'mongoose';

export interface IOTP extends Document {
  userId: Types.ObjectId;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const OTP: Model<IOTP> = model<IOTP>('OTP', OTPSchema);
