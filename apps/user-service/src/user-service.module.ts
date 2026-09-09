import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { DatabaseModule } from './database/database.module';
import { KafkaModule } from '@app/kafka';


@Module({
  imports: [
    KafkaModule.register('user-service-consumer'),
    DatabaseModule
  ],
  controllers: [UserServiceController],
  providers: [UserService],
})
export class UserServiceModule { }
