// Invite Code Schema
// Add to shared/schema.ts

import { pgTable, serial, varchar, integer, timestamp, boolean, text } from "drizzle-orm/pg-core";

export const inviteCodes = pgTable("invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  accountType: varchar("account_type", { length: 20 }).notNull(), // 'analyst' | 'investor' | 'admin'
  maxUses: integer("max_uses").notNull().default(1),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
});

// Add to users table:
// inviteCodeUsed: varchar("invite_code_used", { length: 32 }),
// invitedAt: timestamp("invited_at"),
