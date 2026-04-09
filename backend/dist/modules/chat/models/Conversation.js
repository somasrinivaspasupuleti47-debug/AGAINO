"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
const mongoose_1 = require("mongoose");
const ConversationSchema = new mongoose_1.Schema({
    listingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    participants: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: 'User',
        required: true,
        index: true,
    },
    lastMessage: {
        content: { type: String },
        sentAt: { type: Date },
        senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    },
}, { timestamps: true });
ConversationSchema.index({ listingId: 1, participants: 1 }, { unique: true });
exports.Conversation = (0, mongoose_1.model)('Conversation', ConversationSchema);
//# sourceMappingURL=Conversation.js.map