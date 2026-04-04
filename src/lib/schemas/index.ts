import { z } from "zod";

// ─── World ID ─────────────────────────────────────────────────────────────────
export const WorldIDProofSchema = z.object({
  merkle_root: z.string(),
  nullifier_hash: z.string().optional(),
  nullifier: z.string().optional(),
  proof: z.union([z.string(), z.array(z.string())]),
  verification_level: z.string(),
  credential_type: z.string().optional(),
});

export const RPContextSchema = z.object({
  rp_id: z.string(),
  nonce: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  signature: z.string(),
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const CreateTaskSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  budget_hbar: z.number().int().positive(),
  deadline: z.string().datetime(),
});

export const TaskStatusSchema = z.enum([
  "open",
  "claimed",
  "completed",
  "validated",
  "expired",
  "refunded",
]);

export const ClientTypeSchema = z.enum(["human", "agent"]);

// Full task shape as returned by the DB (dates serialized as ISO strings over tRPC)
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  budget_hbar: z.number().int(),
  deadline: z.string().or(z.date()),
  status: TaskStatusSchema,
  client_type: ClientTypeSchema,
  client_nullifier: z.string().nullable(),
  client_agent_wallet: z.string().nullable(),
  client_agent_owner_nullifier: z.string().nullable(),
  worker_nullifier: z.string().nullable(),
  escrow_tx_id: z.string().nullable(),
  payment_tx_id: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ClientType = z.infer<typeof ClientTypeSchema>;

// ─── Agent ────────────────────────────────────────────────────────────────────
export const AgentCreateTaskSchema = CreateTaskSchema.extend({
  agent_wallet: z.string(),
  agentkit_signature: z.string(),
});

// ─── Session ──────────────────────────────────────────────────────────────────
export const SessionPayloadSchema = z.object({
  nullifier: z.string(),
  role: z.enum(["worker", "client", "admin"]),
  userId: z.string(),
});

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;
