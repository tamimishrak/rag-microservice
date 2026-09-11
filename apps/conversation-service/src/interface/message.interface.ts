import { KafkaEventEnvelope } from "@app/common/interface";

export interface MessageCreatedData {
  messageId: string;
  conversationId: string;
  userId: string;
  documentId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM',
  content: string,
}

export type MessageCreatedEvent = KafkaEventEnvelope<MessageCreatedData>;