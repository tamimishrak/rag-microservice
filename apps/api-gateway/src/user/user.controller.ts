import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from 'apps/user-service/src/dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getUser(@Request() req: { user: { userId: string } }) {
    return this.userService.getUser(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('profile')
  updateUser(
    @Body() dto: UpdateUserDto,
    @Request() req: { user: { userId: string } }
  ) {
    return this.userService.updateUser(dto, req.user.userId);
  }
}
