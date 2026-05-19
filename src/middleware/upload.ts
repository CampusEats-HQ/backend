import multer from 'multer';
import { profileStorage, menuStorage } from '../config/cloudinary';

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

function imageFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
}

export const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

export const uploadMenu = multer({
  storage: menuStorage,
  fileFilter: imageFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});
