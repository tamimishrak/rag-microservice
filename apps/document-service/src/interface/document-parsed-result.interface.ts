import { KafkaEventEnvelope } from "@app/common/interface";

export interface DocumentParsedData {
  documentId: string;
  userId: string;
  status: 'COMPLETED' | 'FAILED';
  vectorCollection?: string;
  totalChunks?: number;
  embeddingModel?: string;
  failureReason?: string;
}

export type DocumentParsedEvent = KafkaEventEnvelope<DocumentParsedData>;