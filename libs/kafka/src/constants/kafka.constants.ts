export const KAFKA_BROKER = process.env.KAFKA_BROKER ?? 'localhost:9093';
export const KAFKA_CLIENT_ID = 'aiknowledgebaseapp';
export const KAFKA_CONSUMER_GROUP = 'aiknowledgebaseapp-consumer';

export const KAFKA_TOPICS = { 
  // AUTH Service
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',

  // DOCUMENT SERVICE
  DOCUMENT_CREATED: 'document.created',
  DOCUMENT_PARSED: 'document.parsed',

  // KNOWLEDGE
  KNOWLEDGE_READY: 'knowledge.ready',

  //CONVERSATION SERVICE
  CONVERSATION_CREATED: 'conversation.created',
  MESSAGE_CREATED: 'message.created',
  RESPONSE_GENERATED: 'response.generated' 
} as const;