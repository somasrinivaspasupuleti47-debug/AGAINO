"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const searchService_1 = require("./searchService");
const AppError_1 = require("../../utils/AppError");
exports.searchRouter = (0, express_1.Router)();
// GET /api/v1/search
exports.searchRouter.get('/', async (req, res, next) => {
    try {
        const { q, category, subcategory, condition, minPrice, maxPrice, lat, lng, radius, sort, page, limit, } = req.query;
        const parsedCondition = condition === 'new' || condition === 'used' ? condition : undefined;
        const parsedSort = sort === 'newest' || sort === 'price_asc' || sort === 'price_desc' || sort === 'relevance'
            ? sort
            : undefined;
        const result = await (0, searchService_1.searchListings)({
            q: q || undefined,
            category: category || undefined,
            subcategory: subcategory || undefined,
            condition: parsedCondition,
            minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
            maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
            lat: lat !== undefined ? parseFloat(lat) : undefined,
            lng: lng !== undefined ? parseFloat(lng) : undefined,
            radius: radius !== undefined ? parseFloat(radius) : undefined,
            sort: parsedSort,
            page: page !== undefined ? Math.max(1, parseInt(page, 10)) : 1,
            limit: limit !== undefined ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
        });
        res.json({ status: 'success', data: result });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/search/autocomplete?q=
exports.searchRouter.get('/autocomplete', async (req, res, next) => {
    try {
        const q = String(req.query.q ?? '').trim();
        if (!q) {
            res.json({ status: 'success', data: [] });
            return;
        }
        const suggestions = await (0, searchService_1.autocomplete)(q);
        res.json({ status: 'success', data: suggestions });
    }
    catch (err) {
        next(err);
    }
});
// Error handler
exports.searchRouter.use((err, _req, res, next) => {
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({ status: err.status, message: err.message });
        return;
    }
    next(err);
});
//# sourceMappingURL=searchRouter.js.map