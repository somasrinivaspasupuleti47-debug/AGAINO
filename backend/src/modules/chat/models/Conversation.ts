import { Document, Schema, Model, model, Types } from 'mongoose';

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

const ConversationSchema = new Schema<IConversation>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessage: {
      content: { type: String },
      sentAt: { type: Date },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true },
);

ConversationSchema.index({ listingId: 1, participants: 1 }, { unique: true });

export const Conversation: Model<IConversation> = model<IConversation>(
  'Conversation',
  ConversationSchema,
);
