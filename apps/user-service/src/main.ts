import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { ValidationPipe } from '@nestjs/common';
import { SERVICES_PORTS } from '@app/common/constants';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER, KAFKA_CLIENT_ID } from '@app/kafka/constants/kafka.constants';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);

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
        groupId: 'user-service-consumer'
      }
    }
  });

  await app.startAllMicroservices()

  console.log(`USER SERVICE RUNNING ON PORT -> ${SERVICES_PORTS.USER_SERVICE}`);
  await app.listen(SERVICES_PORTS.USER_SERVICE);
}
bootstrap();
