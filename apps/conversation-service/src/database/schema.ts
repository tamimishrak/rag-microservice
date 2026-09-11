import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const messageRoleEnum = pgEnum('message_role', [
  'USER', 
  'ASSISTANT', 
  'SYSTEM'
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  documentId: uuid('document_id').notNull(),   
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;