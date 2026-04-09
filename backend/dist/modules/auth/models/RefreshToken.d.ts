import { Document, Model, Types } from 'mongoose';
export interface IRefreshToken extends Document {
    userId: Types.ObjectId;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}
export declare const RefreshToken: Model<IRefreshToken>;
//# sourceMappingURL=RefreshToken.d.ts.map