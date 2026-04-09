import { Document, Schema, Model, model } from 'mongoose';

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

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    isVerified: { type: Boolean, default: false, required: true },
    isBlocked: { type: Boolean, default: false, required: true },
    googleId: { type: String },
    avatar: { type: String },
  },
  { timestamps: true },
);

export const User: Model<IUser> = model<IUser>('User', UserSchema);
