import { BadRequestException, Controller, Get, Param, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { DocumentService } from './document.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('document')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService
  ) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadDocument(
    @Request() req: { user: { userId: string } },
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.documentService.uploadDocument(req.user.userId, file);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  getAllDocument(
    @Request() req: { user: { userId: string } }
  ) {
    return this.documentService.getAllDocument(req.user.userId);
  }


  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  getDocument(
    @Request() req: { user: { userId: string } },
    @Param('id') documentId: string,
  ) {
    return this.documentService.getDocument(req.user.userId, documentId);
  }
}
