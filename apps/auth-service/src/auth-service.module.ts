import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthService } from './auth-service.service';
import { DatabaseModule } from './database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { KafkaModule } from '@app/kafka';
import { JwtStrategy } from '@app/common/auth';

@Module({
  imports: [
    KafkaModule.register('auth-service-group'),
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
  controllers: [AuthServiceController],
  providers: [AuthService, JwtStrategy],
})
export class AuthServiceModule {}
