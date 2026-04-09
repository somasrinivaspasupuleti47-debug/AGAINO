"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.avatarRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const uuid_1 = require("uuid");
const auth_1 = require("../../middleware/auth");
const User_1 = require("./models/User");
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
exports.avatarRouter = (0, express_1.Router)();
exports.avatarRouter.post('/me/avatar', auth_1.requireAuth, upload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ status: 'fail', message: 'No image provided' });
            return;
        }
        const avatarsDir = path_1.default.resolve(__dirname, '../../../../uploads/avatars');
        await promises_1.default.mkdir(avatarsDir, { recursive: true });
        const filename = `${(0, uuid_1.v4)()}.webp`;
        const filepath = path_1.default.join(avatarsDir, filename);
        await (0, sharp_1.default)(req.file.buffer).resize(200, 200, { fit: 'cover' }).webp().toFile(filepath);
        const avatarUrl = `/uploads/avatars/${filename}`;
        // Delete old avatar file if exists
        const user = await User_1.User.findById(req.user.userId);
        if (user?.avatar && user.avatar.startsWith('/uploads/')) {
            const oldPath = path_1.default.resolve(__dirname, '../../../../uploads', user.avatar.replace('/uploads/', ''));
            await promises_1.default.unlink(oldPath).catch(() => { });
        }
        await User_1.User.findByIdAndUpdate(req.user.userId, { avatar: avatarUrl });
        res.json({ status: 'success', avatar: avatarUrl });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=avatarRouter.js.map