export const KAFKA_BROKER = process.env.KAFKA_BROKER ?? 'localhost:9093';
export const KAFKA_CLIENT_ID = 'aiknowledgebaseapp';
export const KAFKA_CONSUMER_GROUP = 'aiknowledgebaseapp-consumer';

export const KAFKA_TOPICS = { 
  // AUTH Service
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',

  // DOCUMENT SERVICE
  DOCUMENT_CREATED: 'document.created'
} as const;