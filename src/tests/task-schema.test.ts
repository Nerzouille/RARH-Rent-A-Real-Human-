import { describe, it, expect } from "vitest";
import { z } from "zod";
import { TaskSchema, ClientTypeSchema, CreateTaskSchema } from "@/lib/schemas";
import { TaskIdSchema } from "@/server/routers/task";

// ─── ClientTypeSchema ─────────────────────────────────────────────────────────
describe("ClientTypeSchema", () => {
  it("accepts 'human'", () => {
    expect(() => ClientTypeSchema.parse("human")).not.toThrow();
  });

  it("accepts 'agent'", () => {
    expect(() => ClientTypeSchema.parse("agent")).not.toThrow();
  });

  it("rejects unknown client type", () => {
    expect(() => ClientTypeSchema.parse("bot")).toThrow();
  });
});

// ─── TaskSchema ───────────────────────────────────────────────────────────────
describe("TaskSchema", () => {
  const validHumanTask = {
    id: "task-uuid-123",
    title: "Fix the landing page",
    description: "The CTA button is misaligned on mobile",
    budget_hbar: 20,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "open" as const,
    client_type: "human" as const,
    client_nullifier: "0xnullifier_client",
    client_agent_wallet: null,
    client_agent_owner_nullifier: null,
    worker_nullifier: null,
    escrow_tx_id: null,
    payment_tx_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("accepts a valid human task", () => {
    expect(() => TaskSchema.parse(validHumanTask)).not.toThrow();
  });

  it("accepts a valid agent task", () => {
    const agentTask = {
      ...validHumanTask,
      client_type: "agent" as const,
      client_nullifier: null,
      client_agent_wallet: "0xagent_wallet",
      client_agent_owner_nullifier: "0xowner_nullifier",
    };
    expect(() => TaskSchema.parse(agentTask)).not.toThrow();
  });

  it("accepts a claimed task with worker_nullifier", () => {
    const claimed = {
      ...validHumanTask,
      status: "claimed" as const,
      worker_nullifier: "0xworker_nullifier",
    };
    expect(() => TaskSchema.parse(claimed)).not.toThrow();
  });

  it("accepts all valid statuses", () => {
    const statuses = [
      "open",
      "claimed",
      "completed",
      "validated",
      "expired",
      "refunded",
    ] as const;
    for (const status of statuses) {
      expect(() =>
        TaskSchema.parse({ ...validHumanTask, status })
      ).not.toThrow();
    }
  });

  it("rejects unknown status", () => {
    expect(() =>
      TaskSchema.parse({ ...validHumanTask, status: "pending" })
    ).toThrow();
  });

  it("rejects missing id", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = validHumanTask;
    expect(() => TaskSchema.parse(rest)).toThrow();
  });

  it("accepts Date objects for timestamp fields", () => {
    const withDates = {
      ...validHumanTask,
      deadline: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    expect(() => TaskSchema.parse(withDates)).not.toThrow();
  });
});

// ─── CreateTaskSchema completeness check ─────────────────────────────────────
describe("CreateTaskSchema — field completeness", () => {
  it("requires title, description, budget_hbar, deadline (all DB notNull insert fields)", () => {
    const minimal = {
      title: "A valid title",
      description: "A valid description that is long enough",
      budget_hbar: 10,
      deadline: new Date(Date.now() + 3600000).toISOString(),
    };
    const result = CreateTaskSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("contains exactly the insertable fields (no extra fields leaked)", () => {
    const withExtra = {
      title: "A valid title",
      description: "A valid description that is long enough",
      budget_hbar: 10,
      deadline: new Date(Date.now() + 3600000).toISOString(),
      // These should NOT be in CreateTaskSchema (set server-side)
      client_type: "human",
      client_nullifier: "0xnull",
    };
    // Zod strips unknown keys by default — this should still parse successfully
    const result = CreateTaskSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      // Confirm server-side fields are stripped
      expect("client_type" in result.data).toBe(false);
      expect("client_nullifier" in result.data).toBe(false);
    }
  });
});

// ─── CreateTaskSchema — form validation edge cases (story 3.2) ───────────────
describe("CreateTaskSchema — form validation edge cases", () => {
  const validBase = {
    title: "Pick up package",
    description: "Collect from post office and photograph",
    budget_hbar: 15,
    deadline: new Date(Date.now() + 86400000).toISOString(), // tomorrow
  };

  it("rejects title shorter than 5 chars", () => {
    const result = CreateTaskSchema.safeParse({ ...validBase, title: "Hi" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100 chars", () => {
    const result = CreateTaskSchema.safeParse({
      ...validBase,
      title: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 10 chars", () => {
    const result = CreateTaskSchema.safeParse({
      ...validBase,
      description: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 1000 chars", () => {
    const result = CreateTaskSchema.safeParse({
      ...validBase,
      description: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects budget_hbar of 0", () => {
    const result = CreateTaskSchema.safeParse({ ...validBase, budget_hbar: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative budget_hbar", () => {
    const result = CreateTaskSchema.safeParse({ ...validBase, budget_hbar: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer budget_hbar", () => {
    const result = CreateTaskSchema.safeParse({ ...validBase, budget_hbar: 10.5 });
    expect(result.success).toBe(false);
  });

  it("rejects deadline that is not a valid ISO datetime", () => {
    const result = CreateTaskSchema.safeParse({ ...validBase, deadline: "2026-07-15" });
    expect(result.success).toBe(false);
  });

  it("accepts minimum valid inputs", () => {
    const result = CreateTaskSchema.safeParse({
      title: "Hello",
      description: "Ten chars!",
      budget_hbar: 1,
      deadline: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

// ─── ClientTypeSchema — badge display mapping (story 3.3) ────────────────────
describe("ClientTypeSchema — badge display mapping", () => {
  it("accepts 'agent' and maps to agent badge label", () => {
    const result = ClientTypeSchema.safeParse("agent");
    expect(result.success).toBe(true);
    if (result.success) {
      const label = result.data === "agent" ? "🤖 Autonomous Agent" : "👤 Verified Human";
      expect(label).toBe("🤖 Autonomous Agent");
    }
  });

  it("accepts 'human' and maps to human badge label", () => {
    const result = ClientTypeSchema.safeParse("human");
    expect(result.success).toBe(true);
    if (result.success) {
      const label = result.data === "agent" ? "🤖 Autonomous Agent" : "👤 Verified Human";
      expect(label).toBe("👤 Verified Human");
    }
  });

  it("rejects unknown client types (e.g. 'bot', 'system')", () => {
    expect(ClientTypeSchema.safeParse("bot").success).toBe(false);
    expect(ClientTypeSchema.safeParse("system").success).toBe(false);
    expect(ClientTypeSchema.safeParse("").success).toBe(false);
  });
});

// ─── task.claim input schema — story 3.4 ────────────────────────────────────
describe("task.claim input schema", () => {
  it("accepts a valid UUID task ID string", () => {
    const result = TaskIdSchema.safeParse({ taskId: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID taskId", () => {
    const result = TaskIdSchema.safeParse({ taskId: "task-abc-123" });
    expect(result.success).toBe(false);
  });

  it("rejects missing taskId", () => {
    const result = TaskIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string taskId", () => {
    const result = TaskIdSchema.safeParse({ taskId: 42 });
    expect(result.success).toBe(false);
  });
});

// ─── task.markComplete input schema — story 3.5 ──────────────────────────────
describe("task.markComplete input schema", () => {
  it("accepts a valid UUID task ID string", () => {
    expect(TaskIdSchema.safeParse({ taskId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });

  it("rejects missing taskId", () => {
    expect(TaskIdSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-UUID taskId", () => {
    expect(TaskIdSchema.safeParse({ taskId: "invalid-uuid" }).success).toBe(false);
  });
});

// ─── task.validate input schema — story 3.5 ──────────────────────────────────
describe("task.validate input schema", () => {
  it("accepts a valid UUID task ID string", () => {
    expect(TaskIdSchema.safeParse({ taskId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });

  it("rejects missing taskId", () => {
    expect(TaskIdSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-UUID taskId", () => {
    expect(TaskIdSchema.safeParse({ taskId: "invalid-uuid" }).success).toBe(false);
  });
});

// Integration tests moved to src/tests/task-router.test.ts
