import { KafkaEventEnvelope } from "@app/common/interface";

export interface ConversationCreatedData {
  documentId: string;
  userId: string;
  conversationId: string;
}

export type ConversationCreatedEvent = KafkaEventEnvelope<ConversationCreatedData>;