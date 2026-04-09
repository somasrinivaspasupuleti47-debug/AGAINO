"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchSuggestion = void 0;
const mongoose_1 = require("mongoose");
const SearchSuggestionSchema = new mongoose_1.Schema({
    text: { type: String, required: true, unique: true },
});
SearchSuggestionSchema.index({ text: 'text' });
exports.SearchSuggestion = (0, mongoose_1.model)('SearchSuggestion', SearchSuggestionSchema, 'search_suggestions');
//# sourceMappingURL=SearchSuggestion.js.map