"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTP = void 0;
const mongoose_1 = require("mongoose");
const OTPSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: { createdAt: true, updatedAt: false } });
exports.OTP = (0, mongoose_1.model)('OTP', OTPSchema);
//# sourceMappingURL=OTP.js.map