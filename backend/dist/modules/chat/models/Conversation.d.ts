import { Document, Model, Types } from 'mongoose';
interface ILastMessage {
    content: string;
    sentAt: Date;
    senderId: Types.ObjectId;
}
export interface IConversation extends Document {
    listingId: Types.ObjectId;
    participants: Types.ObjectId[];
    lastMessage?: ILastMessage;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Conversation: Model<IConversation>;
export {};
//# sourceMappingURL=Conversation.d.ts.map