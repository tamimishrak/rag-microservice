import { NestFactory } from '@nestjs/core';
import { ConversationServiceModule } from './conversation-service.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER, KAFKA_CLIENT_ID } from '@app/kafka/constants/kafka.constants';
import { SERVICES_PORTS } from '@app/common/constants';

async function bootstrap() {
  const app = await NestFactory.create(ConversationServiceModule);

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
        groupId: 'conversation-service-consumer'
      }
    }
  });

  await app.startAllMicroservices();

  console.log(`CONVERSATION SERVICE RUNNING ON PORT -> ${SERVICES_PORTS.CONVERSATION_SERVICE}`);
  await app.listen(SERVICES_PORTS.CONVERSATION_SERVICE);
}
bootstrap();
