import { uuid, pgTable, pgEnum, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";


export const statusEnumValues = pgEnum('status', [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'READY'
]);

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(),
  status: statusEnumValues('status').default('PENDING'),
  isActive: boolean('is_active').notNull().default(true),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;


