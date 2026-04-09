"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistEntry = void 0;
const mongoose_1 = require("mongoose");
const WishlistEntrySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Listing', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
WishlistEntrySchema.index({ userId: 1, listingId: 1 }, { unique: true });
exports.WishlistEntry = (0, mongoose_1.model)('WishlistEntry', WishlistEntrySchema);
//# sourceMappingURL=WishlistEntry.js.map