export interface UserRegisteredPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  data: {
    userId: string;
    email: string;
    password: string;
    registeredAt: string;
  };
}