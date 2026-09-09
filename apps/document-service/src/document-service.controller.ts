import { Controller, Get, Headers, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { DocumentService } from './document-service.service';
import { DocumentUploadInterceptor } from '@app/common/interceptors';

@Controller('v1/document')
export class DocumentServiceController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(DocumentUploadInterceptor)
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') userId: string
  ) {
    return this.documentService.uploadDocument(userId, file);
  }
}
