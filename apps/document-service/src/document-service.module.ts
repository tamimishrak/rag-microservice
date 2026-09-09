import { Module } from '@nestjs/common';
import { DocumentServiceController } from './document-service.controller';
import { DocumentService } from './document-service.service';
import { DatabaseModule } from './database/database.module';
import { KafkaModule } from '@app/kafka';

@Module({
  imports: [
    KafkaModule.register('document-service-consumer'),
    DatabaseModule
  ],
  controllers: [DocumentServiceController],
  providers: [DocumentService],
})
export class DocumentServiceModule {}
