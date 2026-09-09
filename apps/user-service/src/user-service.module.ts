import { Module } from '@nestjs/common';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { DatabaseModule } from './database/database.module';
import { KafkaModule } from '@app/kafka';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    KafkaModule.register('user-service-consumer'),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'secret'),
        signOptions: { expiresIn: '1d' }
      })
    }),
    PassportModule,
    DatabaseModule
  ],
  controllers: [UserServiceController],
  providers: [UserService],
})
export class UserServiceModule { }
