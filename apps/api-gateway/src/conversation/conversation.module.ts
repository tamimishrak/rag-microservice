import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ConversationService],
  controllers: [ConversationController]
})
export class ConversationModule {}
