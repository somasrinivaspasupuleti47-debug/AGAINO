import { Document, Model, Types } from 'mongoose';
export interface INotification extends Document {
    userId: Types.ObjectId;
    type: string;
    payload: Record<string, unknown>;
    isRead: boolean;
    createdAt: Date;
}
export declare const Notification: Model<INotification>;
//# sourceMappingURL=Notification.d.ts.map