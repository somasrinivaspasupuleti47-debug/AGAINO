"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const MessageSchema = new mongoose_1.Schema({
    conversationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true,
    },
    senderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], required: true },
    imageUrl: { type: String },
    isRead: { type: Boolean, default: false, required: true },
    readAt: { type: Date },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
MessageSchema.index({ conversationId: 1, createdAt: 1 });
exports.Message = (0, mongoose_1.model)('Message', MessageSchema);
//# sourceMappingURL=Message.js.map