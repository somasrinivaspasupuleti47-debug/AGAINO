import { Document, Schema, Model, model, Types } from 'mongoose';

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

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], required: true },
    imageUrl: { type: String },
    isRead: { type: Boolean, default: false, required: true },
    readAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message: Model<IMessage> = model<IMessage>('Message', MessageSchema);
