import { pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';
import { uuid } from 'drizzle-orm/pg-core';


export const authUser = pgTable('auth_user', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', {length: 150}).notNull(),
  password: varchar('password', { length: 155 }).notNull(),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AuthUser = typeof authUser.$inferSelect;
export type NewAuthUser = typeof authUser.$inferInsert;