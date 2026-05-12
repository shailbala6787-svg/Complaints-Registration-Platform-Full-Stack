import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: text('password').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  otp: varchar('otp', { length: 6 }),
  otpExpiry: timestamp('otp_expiry'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const complaints = pgTable('user_complaints', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  complaintText: text('complaint_text').notNull(),
  aiQuestion: text('ai_question').notNull(),
  userAnswer: text('user_answer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
