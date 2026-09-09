import { KafkaEventEnvelope } from '@app/common/interface';

export interface UserLoggedInData {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export type UserLoggedInEvent = KafkaEventEnvelope<UserLoggedInData>;