import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { KAFKA_SERVICE } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { DatabaseService } from './database/database.service';
import { documents } from './database';
import { DocumentCreatedEvent } from './interface/document-created.interface';
import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { DocumentParsedEvent } from './interface/document-parsed-result.interface';
import { and, eq } from 'drizzle-orm';


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

  async saveParsedServiceResult(payload: DocumentParsedEvent) {
    const { documentId, userId, status, failureReason } = payload.data;

    this.logger.log(`UPDATING DOCUMENT STATUS FOR DOCUMENT ID: ${documentId}, USER ID: ${userId}, STATUS: ${status}`);

    try {
      const [updatedDocument] = await this.dbService.db
        .update(documents)
        .set({
          status,
          failureReason: failureReason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId))
        .returning();

      if (!updatedDocument) {
        this.logger.warn(`Document with ID ${documentId} not found. Skipping update.`);
        return { message: 'Document Not Found', documentId };
      }

      // TODO/ Good to have Kafka emit document.parsed-derived event for Stats Service
      return {
        message: 'Document Status Updated',
        documentId,
        status: updatedDocument.status,
      };
    } catch (error: any) {
      this.logger.error(`Failed to update document status for ID: ${documentId}. Error: ${error.message}`, error.stack);
      throw error;
    }
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
        throw err;
      }
    }
  }

  async getDocument(userId: string, documentId: string) {
    try {
      this.logger.log(`Querying documentId: "${documentId}" for userId: "${userId}"`);
      const [document] = await this.dbService.db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1)
      
      if(!document) throw new NotFoundException('The document does not exist');

      return document;
      
    } catch (error) {
      this.logger.log(`Failed to get the user ${error}`);
      throw error;
    }
  }

  async getAllDocument(userId: string) {
    const allDocument = await this.dbService.db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    

    return allDocument;
  }
}
