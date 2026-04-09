import { Document, Model, Types } from 'mongoose';
export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    content: string;
    type: 'text' | 'image';
    imageUrl?: string;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
}
export declare const Message: Model<IMessage>;
//# sourceMappingURL=Message.d.ts.map