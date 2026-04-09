import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../../middleware/auth';
import { User } from './models/User';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

export const avatarRouter = Router();

avatarRouter.post(
  '/me/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ status: 'fail', message: 'No image provided' });
        return;
      }

      const avatarsDir = path.resolve(__dirname, '../../../../uploads/avatars');
      await fs.mkdir(avatarsDir, { recursive: true });

      const filename = `${uuidv4()}.webp`;
      const filepath = path.join(avatarsDir, filename);

      await sharp(req.file.buffer).resize(200, 200, { fit: 'cover' }).webp().toFile(filepath);

      const avatarUrl = `/uploads/avatars/${filename}`;

      // Delete old avatar file if exists
      const user = await User.findById(req.user!.userId);
      if (user?.avatar && user.avatar.startsWith('/uploads/')) {
        const oldPath = path.resolve(
          __dirname,
          '../../../../uploads',
          user.avatar.replace('/uploads/', ''),
        );
        await fs.unlink(oldPath).catch(() => {});
      }

      await User.findByIdAndUpdate(req.user!.userId, { avatar: avatarUrl });

      res.json({ status: 'success', avatar: avatarUrl });
    } catch (err) {
      next(err);
    }
  },
);
