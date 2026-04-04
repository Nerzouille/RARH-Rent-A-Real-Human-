import { pgTable, text, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["worker", "client", "admin"]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "claimed",
  "completed",
  "validated",
  "expired",
  "refunded",
]);

export const clientTypeEnum = pgEnum("client_type", ["human", "agent"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  nullifier: text("nullifier").notNull().unique(),
  role: userRoleEnum("role").notNull().default("worker"),
  hbar_balance: integer("hbar_balance").notNull().default(0),
  tasks_completed: integer("tasks_completed").notNull().default(0),
  hedera_account_id: text("hedera_account_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// ─── Nullifiers ───────────────────────────────────────────────────────────────
export const nullifiers = pgTable(
  "nullifiers",
  {
    nullifier: text("nullifier").notNull(),
    action: text("action").notNull(),
    verified_at: timestamp("verified_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.nullifier, t.action)]
);

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget_hbar: integer("budget_hbar").notNull(),
  deadline: timestamp("deadline").notNull(),
  status: taskStatusEnum("status").notNull().default("open"),
  client_type: clientTypeEnum("client_type").notNull(),
  client_nullifier: text("client_nullifier"),
  client_agent_wallet: text("client_agent_wallet"),
  client_agent_owner_nullifier: text("client_agent_owner_nullifier"),
  worker_nullifier: text("worker_nullifier"),
  escrow_tx_id: text("escrow_tx_id"),
  payment_tx_id: text("payment_tx_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Nullifier = typeof nullifiers.$inferSelect;
