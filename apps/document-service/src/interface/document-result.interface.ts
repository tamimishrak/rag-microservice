import { KafkaEventEnvelope } from "@app/common/interface";

export interface DocumentParsingResultData {
  documentId: string;
  userId: string;
  status: 'COMPLETED' | 'FAILED';
  errorReason?: string;
}

export type DocumentParsingResultEvent = KafkaEventEnvelope<DocumentParsingResultData>;