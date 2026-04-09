import { Document, Model } from 'mongoose';
export interface IUser extends Document {
    email: string;
    displayName: string;
    passwordHash: string;
    role: 'user' | 'admin';
    isVerified: boolean;
    isBlocked: boolean;
    googleId?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: Model<IUser>;
//# sourceMappingURL=User.d.ts.map