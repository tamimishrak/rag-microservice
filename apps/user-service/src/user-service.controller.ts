import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { UserService } from './user-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import type { UserRegisteredPayload } from './interface/user-registered-payload.interface';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('v1/user')
export class UserServiceController {
  constructor(private readonly userService: UserService) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(@Payload() payload: UserRegisteredPayload) {
    await this.userService.initializeUser(payload);
  }

  // Todo Replace @Param with @Header('x-user-id')
  @Get(':id')
  async getProfile(@Param('id') userId: string) {
    return this.userService.getUser(userId);
  }

  @Put(':id')
  async updateProfile(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(userId, dto);
  }
}
