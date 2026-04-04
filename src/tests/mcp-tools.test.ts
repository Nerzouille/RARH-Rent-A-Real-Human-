/**
 * MCP task tools — integration tests with PGLite in-memory DB.
 *
 * Tests createAgentTask, getAgentTaskStatus, validateAgentTask
 * with real DB queries. Hedera and AgentBook are mocked.
 * AgentKit context (getAuthenticatedAgentWallet) is mocked per-test.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { getTestDb, resetTestDb, type TestDb } from "./helpers/db";

const AGENT_WALLET = "0xabcdef1234567890abcdef1234567890abcdef12";
const FUTURE_DEADLINE = new Date(Date.now() + 86_400_000).toISOString();

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/core/hedera", () => ({
  releasePayment: vi.fn().mockResolvedValue("0.0.1234@1700000001.000"),
  lockEscrow: vi.fn().mockResolvedValue("0.0.1234@1700000000.000"),
  hashscanUrl: (txId: string) => `https://hashscan.io/testnet/transaction/${txId}`,
}));

vi.mock("@/lib/core/agentkit", () => ({
  lookupAgentBookOwner: vi.fn().mockResolvedValue({
    nullifier: "agent-owner-nullifier",
    status: "verified",
  }),
}));

// getAuthenticatedAgentWallet is called inside task-tools; we mock the context module
vi.mock("@/server/mcp/context", () => ({
  getAuthenticatedAgentWallet: vi.fn().mockReturnValue(AGENT_WALLET),
  runWithAgentRequestContext: vi.fn((wallet: string, fn: () => unknown) => fn()),
}));

let testDb: TestDb;

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb;
  },
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  testDb = await getTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  vi.clearAllMocks();
  // Reset context mock to default authenticated wallet
  const { getAuthenticatedAgentWallet } = await import("@/server/mcp/context");
  vi.mocked(getAuthenticatedAgentWallet).mockReturnValue(AGENT_WALLET);
});

// ─── createAgentTask ─────────────────────────────────────────────────────────

describe("createAgentTask", () => {
  it("inserts a task with client_type=agent", async () => {
    const { createAgentTask } = await import("@/server/mcp/task-tools");

    const result = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "AI-generated content task",
      description: "Generate a product description for a new widget",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    expect(result.task_id).toBeTruthy();
    expect(result.escrow_tx_id).toBeTruthy();
    expect(result.status).toBe("open");

    const task = await testDb.query.tasks.findFirst({
      where: (t, { eq }) => eq(t.id, result.task_id),
    });
    expect(task?.client_type).toBe("agent");
    expect(task?.client_agent_wallet).toBe(AGENT_WALLET.toLowerCase());
  });

  it("stores AgentBook owner nullifier on the task", async () => {
    const { createAgentTask } = await import("@/server/mcp/task-tools");

    const result = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Task with AgentBook owner",
      description: "Owner nullifier should be stored for audit trail",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    const task = await testDb.query.tasks.findFirst({
      where: (t, { eq }) => eq(t.id, result.task_id),
    });
    expect(task?.client_agent_owner_nullifier).toBe("agent-owner-nullifier");
  });

  it("returns agentbook_status from lookup", async () => {
    const { createAgentTask } = await import("@/server/mcp/task-tools");

    const result = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "AgentBook status test",
      description: "Result should carry AgentBook verification status",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    expect(result.agentbook_status).toBe("verified");
  });

  it("throws if agent_wallet does not match authenticated context", async () => {
    const { getAuthenticatedAgentWallet } = await import("@/server/mcp/context");
    vi.mocked(getAuthenticatedAgentWallet).mockReturnValue("0x0000000000000000000000000000000000000001");

    const { createAgentTask } = await import("@/server/mcp/task-tools");

    await expect(
      createAgentTask({
        agent_wallet: AGENT_WALLET,
        title: "Spoofed wallet task",
        description: "Should be rejected when wallets do not match",
        budget_hbar: 5,
        deadline: FUTURE_DEADLINE,
      })
    ).rejects.toThrow(/Unauthorized/);
  });
});

// ─── getAgentTaskStatus ───────────────────────────────────────────────────────

describe("getAgentTaskStatus", () => {
  it("returns task status for the owning agent", async () => {
    const { createAgentTask, getAgentTaskStatus } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Status check task",
      description: "This task will be polled for status",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    const result = await getAgentTaskStatus({
      task_id: created.task_id,
      agent_wallet: AGENT_WALLET,
    });

    expect(result.task_id).toBe(created.task_id);
    expect(result.status).toBe("open");
    expect(result.escrow_tx_id).toBeTruthy();
  });

  it("throws if task is not found", async () => {
    const { getAgentTaskStatus } = await import("@/server/mcp/task-tools");

    await expect(
      getAgentTaskStatus({
        task_id: "non-existent-task-id",
        agent_wallet: AGENT_WALLET,
      })
    ).rejects.toThrow(/Task not found/);
  });

  it("throws if agent does not own the task", async () => {
    const { createAgentTask, getAgentTaskStatus } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Owned task",
      description: "This task belongs to AGENT_WALLET, not the other one",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    // Switch authenticated wallet to a different agent
    const { getAuthenticatedAgentWallet } = await import("@/server/mcp/context");
    const OTHER_WALLET = "0x1111111111111111111111111111111111111111";
    vi.mocked(getAuthenticatedAgentWallet).mockReturnValue(OTHER_WALLET);

    await expect(
      getAgentTaskStatus({
        task_id: created.task_id,
        agent_wallet: OTHER_WALLET,
      })
    ).rejects.toThrow(/Unauthorized/);
  });
});

// ─── validateAgentTask ────────────────────────────────────────────────────────

describe("validateAgentTask", () => {
  it("sets status=validated for a completed task", async () => {
    const { tasks } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { createAgentTask, validateAgentTask } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Task to validate",
      description: "This task will be completed and then validated",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    // Manually advance task to completed status (skipping claim/markComplete)
    await testDb
      .update(tasks)
      .set({ status: "completed", worker_nullifier: "some-worker" })
      .where(eq(tasks.id, created.task_id));

    const result = await validateAgentTask({
      task_id: created.task_id,
      agent_wallet: AGENT_WALLET,
    });

    expect(result.status).toBe("validated");
    expect(result.payment_tx_id).toBeTruthy();
  });

  it("throws if task status is not completed", async () => {
    const { createAgentTask, validateAgentTask } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Open task validation attempt",
      description: "Cannot validate an open task",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    await expect(
      validateAgentTask({
        task_id: created.task_id,
        agent_wallet: AGENT_WALLET,
      })
    ).rejects.toThrow(/completed/);
  });

  it("throws if agent does not own the task", async () => {
    const { tasks } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { createAgentTask, validateAgentTask } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Task ownership check",
      description: "Only the owning agent can validate this task",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    await testDb
      .update(tasks)
      .set({ status: "completed" })
      .where(eq(tasks.id, created.task_id));

    const OTHER_WALLET = "0x1111111111111111111111111111111111111111";
    const { getAuthenticatedAgentWallet } = await import("@/server/mcp/context");
    vi.mocked(getAuthenticatedAgentWallet).mockReturnValue(OTHER_WALLET);

    await expect(
      validateAgentTask({
        task_id: created.task_id,
        agent_wallet: OTHER_WALLET,
      })
    ).rejects.toThrow(/Unauthorized/);
  });

  it("is idempotency-safe: second validation attempt throws", async () => {
    const { tasks } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { createAgentTask, validateAgentTask } = await import("@/server/mcp/task-tools");

    const created = await createAgentTask({
      agent_wallet: AGENT_WALLET,
      title: "Double-validation guard",
      description: "The second validate call should fail",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    await testDb
      .update(tasks)
      .set({ status: "completed" })
      .where(eq(tasks.id, created.task_id));

    await validateAgentTask({ task_id: created.task_id, agent_wallet: AGENT_WALLET });

    await expect(
      validateAgentTask({ task_id: created.task_id, agent_wallet: AGENT_WALLET })
    ).rejects.toThrow();
  });
});
