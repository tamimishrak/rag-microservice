import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { ValidationPipe } from '@nestjs/common';
import { SERVICES_PORTS } from '@app/common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  console.log(`AUTH SERVICE RUNNING ON PORT -> ${SERVICES_PORTS.AUTH_SERVICE}`);
  await app.listen(SERVICES_PORTS.AUTH_SERVICE);
}
bootstrap();
