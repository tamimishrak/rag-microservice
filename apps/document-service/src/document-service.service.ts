import { KAFKA_SERVICE } from '@app/kafka';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { DatabaseService } from './database/database.service';
import { documents } from './database';
import { DocumentCreatedEvent } from './interface/document-created.interface';
import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

@Injectable()
export class DocumentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DatabaseService
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID header (x-user-id) is required');
      }

      if (!file) {
        throw new BadRequestException('File is required');
      }

      const [document] = await this.dbService.db
        .insert(documents)
        .values({
          userId,
          fileName: file.originalname,
          filePath: file.path,
          status: 'PENDING'
        })
        .returning();

      this.logger.log(`DOCUMENT DATA STORED ${JSON.stringify(document)}`);

      const documentCreatedEvent: DocumentCreatedEvent = {
        eventId: randomUUID(),
        eventType: KAFKA_TOPICS.DOCUMENT_CREATED,
        timestamp: new Date().toISOString(),
        version: 1,
        data: {
          documentId: document.id,
          userId: document.userId,
          fileName: document.fileName,
          filePath: document.filePath
        }
      }

      this.kafkaClient.emit(KAFKA_TOPICS.DOCUMENT_CREATED, documentCreatedEvent);
      this.logger.log(`KAFKA MESSAGE PUBLISHED ${KAFKA_TOPICS.DOCUMENT_CREATED}`);

      return {
        message: 'File Uploaded, Process Started.',
        document
      }
    } catch (error: any) {
      await this.cleanupFile(file.path);
      this.logger.error(`Upload document failed: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Document upload failed');
    }
  }

  private async cleanupFile(filePath?: string) {
    if (filePath && existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (err) {
        this.logger.error(`Failed to delete file: ${filePath}`, err);
      }
    }
  }
}
