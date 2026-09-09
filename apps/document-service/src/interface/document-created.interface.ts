import { KafkaEventEnvelope } from "@app/common/interface";

export interface DocumentCreatedData {
  documentId: string;
  userId: string;
  fileName: string;
  filePath: string;
}

export type DocumentCreatedEvent = KafkaEventEnvelope<DocumentCreatedData>;