import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { AuthGuard } from '@nestjs/passport';
import { StartConversationDto } from 'apps/conversation-service/src/dto/start-conversation.dto';
import { CreateMessageDto } from 'apps/conversation-service/src/dto/create-message.dto';

@Controller('conversation')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  startConversation(
    @Request() req: { user: {userId: string} },
    @Body() dto: StartConversationDto
  ) {
    return this.conversationService.startConversation(req.user.userId, dto);
  }

  @Post(':conversationId')
  sendMessage(
    @Request() req: { user: {userId: string} },
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.sendMessage(req.user.userId, conversationId, dto);
  }
}
