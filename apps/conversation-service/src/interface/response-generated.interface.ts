import { KafkaEventEnvelope } from "@app/common/interface";

export interface ResponseGeneratedData {
  conversationId: string;
  userId: string;
  messageId: string;               
  documentId?: string | null;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  status: 'COMPLETED' | 'FAILED';
  content?: string | null;
  model?: string | null;
  retrievedChunks?: number | null;
  failureReason?: string | null;
}

export type ResponseGeneratedEvent = KafkaEventEnvelope<ResponseGeneratedData>;