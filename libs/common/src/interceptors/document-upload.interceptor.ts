import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';


const uploadPath = join(process.cwd(), 'uploads', 'documents');

if (!existsSync(uploadPath)) {
  mkdirSync(uploadPath, { recursive: true });
}

export const DocumentUploadInterceptor = FileInterceptor('file', {
  storage: diskStorage({
    destination: uploadPath,
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `doc-${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(
        new BadRequestException('Only PDF files are allowed'),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});