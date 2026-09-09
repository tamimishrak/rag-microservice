export interface KafkaEventEnvelope<T> {
  eventId: string;     
  eventType: string;   
  timestamp: string;   
  version: number;     
  data: T;             
}