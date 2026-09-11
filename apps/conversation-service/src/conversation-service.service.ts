import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { KAFKA_SERVICE } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { DocumentServiceClient } from './clients/document-service.client';
import { conversations, messages } from './database';
import { and, asc, desc, eq } from 'drizzle-orm';
import { MessageCreatedEvent } from './interface/message.interface';
import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import { CreateMessageDto } from './dto/create-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { ConversationCreatedEvent } from './interface/conversation.interface';
import { ResponseGeneratedEvent } from './interface/response-generated.interface';

@Injectable()
export class ConversationService implements OnModuleInit {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DatabaseService,
    private readonly documentServiceClient: DocumentServiceClient
  ) { }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async handleResponseGenerated(payload: ResponseGeneratedEvent) {
    const data = payload.data;

    this.logger.log(
      `Handling response.generated for conversation ${data.conversationId}, status=${data.status}`,
    );

    if (data.role !== 'ASSISTANT') {
      this.logger.debug(`Ignoring non-ASSISTANT role: ${data.role}`);
      return;
    }

    let contentToStore: string;

    if (data.status === 'COMPLETED' && data.content) {
      contentToStore = data.content;
    } else {
      contentToStore = data.failureReason ?? 'Failed to generate a response. Please try again.';
    }

    try {
      const [assistantMessage] = await this.dbService.db
        .insert(messages)
        .values({
          conversationId: data.conversationId,
          role: data.role,
          content: contentToStore,
          model: data.model ?? null,
          retrievedChunks: data.retrievedChunks ?? null,
          status: data.status,
          failureReason: data.failureReason ?? null,
        })
        .returning();

      await this.dbService.db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, data.conversationId));

      this.logger.log(`Assistant message saved: ${assistantMessage.id}`);
      return assistantMessage;
    } catch (error) {
      this.logger.error(
        `Failed to save assistant message for conversation ${data.conversationId}`,
        error,
      );
      throw error;
    }
  }

  async getConversation(userId: string, conversationId: string) {
    const [conversation] = await this.dbService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('You do not own this conversation');
    }

    const messageList = await this.dbService.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return {
      conversation,
      messages: messageList,
    };
  }

  async getAllConversation(userId: string) {
    const allConversations = await this.dbService.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    return allConversations;
  }

  async startConversation(userId: string, dto: StartConversationDto) {
    const document = await this.documentServiceClient.getDocumentById(dto.documentId, userId);

    if (!document) throw new NotFoundException('Document not found');
    if (document.userId !== userId) throw new ForbiddenException('You do not own this document');
    if (document.status !== 'READY') throw new BadRequestException(`Document not ready (status: ${document.status})`);

    let [conversation] = await this.dbService.db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.documentId, dto.documentId)
      )
    );

    let isNewConversation = false;

    if (!conversation) {
      [conversation] = await this.dbService.db
      .insert(conversations)
      .values({
        userId,
        documentId: dto.documentId,
        title: document.fileName
      })
      .returning();

      isNewConversation = true;

      const conversationCreatedEvent: ConversationCreatedEvent = {
        eventId: randomUUID(),
        eventType: KAFKA_TOPICS.CONVERSATION_CREATED,
        timestamp: new Date().toISOString(),
        version: 1,
        data: {
          conversationId: conversation.id,
          documentId: conversation.documentId,
          userId: userId,
        }
      };

      this.kafkaClient.emit(KAFKA_TOPICS.CONVERSATION_CREATED, conversationCreatedEvent);
    }

    const [message] = await this.dbService.db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: 'USER',
        content: dto.content
      })
      .returning();
    
      //  mainly for Agent
    const messageCreatedEvent: MessageCreatedEvent = {
      eventId: randomUUID(),
      eventType: KAFKA_TOPICS.MESSAGE_CREATED,
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        messageId: message.id,
        conversationId: conversation.id,
        documentId: dto.documentId,
        userId,
        content: dto.content,
        role: 'USER',
      },
    };

    this.kafkaClient.emit(KAFKA_TOPICS.MESSAGE_CREATED, messageCreatedEvent);

    return { conversation, message, isNewConversation };
  }

  async sendMessage(userId: string, conversationId: string, dto: CreateMessageDto) {
    const [conversation] = await this.dbService.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId) throw new ForbiddenException();

    const [message] = await this.dbService.db
      .insert(messages)
      .values({
        conversationId,
        role: 'USER',
        content: dto.content
      })
      .returning();

    const messageCreatedEvent: MessageCreatedEvent = {
      eventId: randomUUID(),
      eventType: KAFKA_TOPICS.MESSAGE_CREATED,
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        messageId: message.id,
        conversationId: conversationId,
        documentId: conversation.documentId,
        userId: userId,
        content: dto.content,
        role: 'USER',
      }
    }

    this.kafkaClient.emit(KAFKA_TOPICS.MESSAGE_CREATED, messageCreatedEvent);

    return { message };
  }
}
