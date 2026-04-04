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
