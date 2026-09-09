import { NestFactory } from '@nestjs/core';
import { DocumentServiceModule } from './document-service.module';
import { SERVICES_PORTS } from '@app/common/constants';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER, KAFKA_CLIENT_ID } from '@app/kafka/constants/kafka.constants';

async function bootstrap() {
  const app = await NestFactory.create(DocumentServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: KAFKA_CLIENT_ID,
        brokers: [KAFKA_BROKER]
      },
      consumer: {
        groupId: 'document-service-consumer'
      }
    }
  });

  await app.startAllMicroservices();
  
  console.log(`DOCUMENT SERVICE RUNNING ON PORT -> ${SERVICES_PORTS.DOCUMENT_SERVICE}`);
  await app.listen(SERVICES_PORTS.DOCUMENT_SERVICE);
}
bootstrap();
