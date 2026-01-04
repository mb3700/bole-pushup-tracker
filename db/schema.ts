import { pgTable, text, serial, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
});

export const pushups = pgTable("pushups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  count: integer("count").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const walks = pgTable("walks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  miles: real("miles").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertPushupSchema = createInsertSchema(pushups);
export const selectPushupSchema = createSelectSchema(pushups);
export const insertWalkSchema = createInsertSchema(walks);
export const selectWalkSchema = createSelectSchema(walks);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertPushup = typeof pushups.$inferInsert;
export type SelectPushup = typeof pushups.$inferSelect;
export type InsertWalk = typeof walks.$inferInsert;
export type SelectWalk = typeof walks.$inferSelect;