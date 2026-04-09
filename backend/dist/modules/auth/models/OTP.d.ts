import { Document, Model, Types } from 'mongoose';
export interface IOTP extends Document {
    userId: Types.ObjectId;
    codeHash: string;
    expiresAt: Date;
    createdAt: Date;
}
export declare const OTP: Model<IOTP>;
//# sourceMappingURL=OTP.d.ts.map