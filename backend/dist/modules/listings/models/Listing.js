"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Listing = void 0;
const mongoose_1 = require("mongoose");
const ListingSchema = new mongoose_1.Schema({
    sellerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true },
    condition: { type: String, enum: ['new', 'used'], required: true },
    status: {
        type: String,
        enum: ['draft', 'published', 'sold', 'archived'],
        default: 'draft',
        required: true,
    },
    isFeatured: { type: Boolean, default: false, required: true, index: true },
    images: [
        {
            original: { type: String, required: true },
            thumbnail: { type: String, required: true },
        },
    ],
    location: {
        city: { type: String, required: true },
        region: { type: String, required: true },
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: {
                type: [Number],
            },
        },
    },
    expiresAt: { type: Date },
    viewCount: { type: Number, default: 0, required: true },
}, { timestamps: true });
ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ category: 1, status: 1 });
ListingSchema.index({ 'location.coordinates': '2dsphere' });
ListingSchema.index({ title: 'text', description: 'text' });
exports.Listing = (0, mongoose_1.model)('Listing', ListingSchema);
//# sourceMappingURL=Listing.js.map