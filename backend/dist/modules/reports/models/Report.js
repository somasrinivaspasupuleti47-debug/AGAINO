"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const mongoose_1 = require("mongoose");
const ReportSchema = new mongoose_1.Schema({
    listingId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    reporterId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
        type: String,
        enum: ['spam', 'fraud', 'inappropriate', 'duplicate', 'other'],
        required: true,
    },
    description: { type: String },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed'],
        required: true,
        default: 'pending',
    },
}, { timestamps: { createdAt: true, updatedAt: false } });
ReportSchema.index({ reporterId: 1, listingId: 1 }, { unique: true });
exports.Report = (0, mongoose_1.model)('Report', ReportSchema);
//# sourceMappingURL=Report.js.map