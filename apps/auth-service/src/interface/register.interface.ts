import { KafkaEventEnvelope } from '@app/common/interface';

export interface UserRegisteredData {
  userId: string;
  email: string;
  password: string,
  registeredAt: string;
}

export type UserRegisteredEvent = KafkaEventEnvelope<UserRegisteredData>;