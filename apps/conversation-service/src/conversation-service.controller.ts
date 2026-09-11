import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ConversationService } from './conversation-service.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('v1/conversation')
export class ConversationServiceController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  startConversation(
    @Headers('x-user-id') userId: string,
    @Body() dto: StartConversationDto 
  ) {
    return this.conversationService.startConversation(
      userId, 
      dto
    );
  }

  @Post(':conversationId')
  async sendMessage(
    @Headers('x-user-id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.sendMessage(userId, conversationId, dto);
  }
}
