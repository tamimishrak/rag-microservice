import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ConversationService } from './conversation-service.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import type { ResponseGeneratedEvent } from './interface/response-generated.interface';

@Controller('v1/conversation')
export class ConversationServiceController {
  constructor(private readonly conversationService: ConversationService) {}

  @EventPattern(KAFKA_TOPICS.RESPONSE_GENERATED)
  handleResponseGenerated(@Payload() payload: ResponseGeneratedEvent) {
    console.log('>>> RECEIVED response.generated', JSON.stringify(payload, null, 2));
    return this.conversationService.handleResponseGenerated(payload);
  }

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
  sendMessage(
    @Headers('x-user-id') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationService.sendMessage(userId, conversationId, dto);
  }

  @Get()
  getAllConversation(
    @Headers('x-user-id') userId: string 
  ) {
    return this,this.conversationService.getAllConversation(userId);
  }

  @Get(':conversationId')
  getConversation(
    @Headers('x-user-id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationService.getConversation(userId, conversationId);
  }
}
