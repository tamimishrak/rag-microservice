import { 
  Controller, 
  Get, 
  Headers, 
  Param, 
  Post, 
  UploadedFile, 
  UseInterceptors 
} from '@nestjs/common';
import { DocumentService } from './document-service.service';
import { DocumentUploadInterceptor } from '@app/common/interceptors';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import type { DocumentParsedEvent } from './interface/document-parsed-result.interface';

@Controller('v1/document')
export class DocumentServiceController {
  constructor(private readonly documentService: DocumentService) { }

  @EventPattern(KAFKA_TOPICS.DOCUMENT_PARSED)
  async handleDocumentParsed(@Payload() payload: DocumentParsedEvent) {
    await this.documentService.saveParsedServiceResult(payload);
  }

  @Post('upload')
  @UseInterceptors(DocumentUploadInterceptor)
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-user-id') userId: string
  ) {
    return this.documentService.uploadDocument(userId, file);
  }

  @Get()
  getAllDocument(
    @Headers('x-user-id') userId: string,
  ) {
    return this.documentService.getAllDocument(userId);
  }

  @Get(':id')
  getDocument(
    @Headers('x-user-id') userId: string,
    @Param('id') documentId: string
  ) {
    return this.documentService.getDocument(userId, documentId)
  }
}
