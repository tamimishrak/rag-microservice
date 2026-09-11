import { Module } from '@nestjs/common';
import { ConversationServiceController } from './conversation-service.controller';
import { ConversationService } from './conversation-service.service';
import { DatabaseModule } from './database/database.module';
import { HttpModule } from '@nestjs/axios';
import { DocumentServiceClient } from './clients/document-service.client';
import { KafkaModule } from '@app/kafka';

@Module({
  imports: [
    KafkaModule.register('conversatioin-service-consumer'),
    HttpModule.register({ timeout: 5000 }),
    DatabaseModule,
  ],
  controllers: [ConversationServiceController],
  providers: [ConversationService, DocumentServiceClient],
})
export class ConversationServiceModule {}
