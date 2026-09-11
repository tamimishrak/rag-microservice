import { KafkaEventEnvelope } from "@app/common/interface";

export interface KnowledgeReadyData {
  documentId: string;
  userId: string;
  status: 'READY' | 'FAILED',
  failureReason?: string,
}

export type KnowledgeReadyEvent = KafkaEventEnvelope<KnowledgeReadyData>;