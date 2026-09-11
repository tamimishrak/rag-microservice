export const SERVICES = {
  API_GATEWAY: 'api-gateway',
  AUTH_SERVICE: 'auth-service',
  USER_SERVICE: 'user-service',
  DOCUMENT_SERVICE: 'document-service',
  CONVERSATION_SERVICE: 'conversation-service'
} as const;

export const SERVICES_PORTS = {
  API_GATEWAY: 3000,
  AUTH_SERVICE: 3001,
  USER_SERVICE: 3002,
  DOCUMENT_SERVICE: 3003,
  CONVERSATION_SERVICE: 3004
} as const;