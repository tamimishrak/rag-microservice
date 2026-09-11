import { KafkaEventEnvelope } from "@app/common/interface";

export interface KnowledgeReadyData {
  documentId: string;
  userId: string;
  status: 'READY' | 'FAILED',
  isActive: boolean,
  failureReason?: string,
}

export type KnowledgeReadyEvent = KafkaEventEnvelope<KnowledgeReadyData>;