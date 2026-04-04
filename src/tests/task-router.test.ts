/**
 * tRPC task router — integration tests with PGLite in-memory DB.
 *
 * Hedera (lockEscrow / releasePayment) is mocked — we test DB logic only.
 * Session is injected via makeTaskCaller (no HTTP).
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { getTestDb, resetTestDb, type TestDb } from "./helpers/db";
import { makeTaskCaller, workerSession, clientSession } from "./helpers/trpc";

// ─── Mock external dependencies ──────────────────────────────────────────────

vi.mock("@/lib/core/hedera", () => ({
  lockEscrow: vi.fn().mockResolvedValue("0.0.1234@1700000000.000"),
  releasePayment: vi.fn().mockResolvedValue("0.0.1234@1700000001.000"),
  hashscanUrl: (txId: string) => `https://hashscan.io/testnet/transaction/${txId.replace("@", "-")}`,
}));

// Replace the live postgres db with our PGLite test instance
let testDb: TestDb;

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FUTURE_DEADLINE = new Date(Date.now() + 86_400_000).toISOString();

async function seedClient(
  db: TestDb,
  nullifier = "test-client-nullifier",
  hbarBalance = 500
) {
  await db.insert((await import("@/server/db/schema")).users).values({
    id: `user-${nullifier}`,
    nullifier,
    role: "client",
    hbar_balance: hbarBalance,
  });
}

async function seedWorker(
  db: TestDb,
  nullifier = "test-worker-nullifier",
  hederaAccountId = "0.0.9999"
) {
  await db.insert((await import("@/server/db/schema")).users).values({
    id: `user-${nullifier}`,
    nullifier,
    role: "worker",
    hedera_account_id: hederaAccountId,
  });
}

async function seedTask(
  db: TestDb,
  overrides: Record<string, unknown> = {}
) {
  const { tasks } = await import("@/server/db/schema");
  const id = crypto.randomUUID();
  const [task] = await db
    .insert(tasks)
    .values({
      id,
      title: "Test Task",
      description: "A task for integration testing purposes",
      budget_hbar: 10,
      deadline: new Date(FUTURE_DEADLINE),
      status: "open",
      client_type: "human",
      client_nullifier: "test-client-nullifier",
      ...overrides,
    })
    .returning();
  return task;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  testDb = await getTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  vi.clearAllMocks();
});

// ─── task.list ────────────────────────────────────────────────────────────────

describe("task.list", () => {
  it("returns open tasks by default", async () => {
    await seedClient(testDb);
    await seedTask(testDb, { status: "open" });
    await seedTask(testDb, { status: "claimed" });

    const caller = makeTaskCaller();
    const result = await caller.list({});

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("open");
  });

  it("filters by status when provided", async () => {
    await seedClient(testDb);
    await seedTask(testDb, { status: "open" });
    await seedTask(testDb, { status: "claimed" });

    const caller = makeTaskCaller();
    const result = await caller.list({ status: "claimed" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("claimed");
  });

  it("returns empty array when no tasks match filter", async () => {
    const caller = makeTaskCaller();
    const result = await caller.list({ status: "validated" });
    expect(result).toHaveLength(0);
  });
});

// ─── task.create ─────────────────────────────────────────────────────────────

describe("task.create", () => {
  it("creates a task with client_nullifier from session", async () => {
    await seedClient(testDb);

    const caller = makeTaskCaller(clientSession());
    const result = await caller.create({
      title: "Write a blog post",
      description: "Write a 500-word blog post about blockchain",
      budget_hbar: 10,
      deadline: FUTURE_DEADLINE,
    });

    expect(result.client_nullifier).toBe("test-client-nullifier");
    expect(result.client_type).toBe("human");
    expect(result.status).toBe("open");
    expect(result.escrow_tx_id).toBe("0.0.1234@1700000000.000");
    expect(result.hashscanLink).toContain("hashscan.io");
  });

  it("sets escrow_tx_id from Hedera mock", async () => {
    const { lockEscrow } = await import("@/lib/core/hedera");
    await seedClient(testDb);

    const caller = makeTaskCaller(clientSession());
    await caller.create({
      title: "Test escrow task",
      description: "Verifying escrow TX is stored on task",
      budget_hbar: 5,
      deadline: FUTURE_DEADLINE,
    });

    expect(lockEscrow).toHaveBeenCalledOnce();
    expect(lockEscrow).toHaveBeenCalledWith(5, expect.any(String), "test-client-nullifier");
  });

  it("deducts hbar_balance from client after creation", async () => {
    const { users } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await seedClient(testDb, "test-client-nullifier", 100);

    const caller = makeTaskCaller(clientSession());
    await caller.create({
      title: "Balance deduction test",
      description: "Checking balance is reduced after task creation",
      budget_hbar: 30,
      deadline: FUTURE_DEADLINE,
    });

    const user = await testDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.nullifier, "test-client-nullifier"),
    });
    expect(user?.hbar_balance).toBe(70);
  });

  it("throws BAD_REQUEST if client has insufficient balance", async () => {
    await seedClient(testDb, "test-client-nullifier", 5);

    const caller = makeTaskCaller(clientSession());
    await expect(
      caller.create({
        title: "Expensive task",
        description: "This task costs more than the client balance",
        budget_hbar: 100,
        deadline: FUTURE_DEADLINE,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: /Insufficient balance/ });
  });

  it("throws UNAUTHORIZED if no session", async () => {
    const caller = makeTaskCaller(null);
    await expect(
      caller.create({
        title: "Anon task",
        description: "Should be rejected without session",
        budget_hbar: 10,
        deadline: FUTURE_DEADLINE,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── task.claim ──────────────────────────────────────────────────────────────

describe("task.claim", () => {
  it("sets status=claimed and worker_nullifier", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    const task = await seedTask(testDb);

    const caller = makeTaskCaller(workerSession());
    const result = await caller.claim({ taskId: task.id });

    expect(result.status).toBe("claimed");
    expect(result.worker_nullifier).toBe("test-worker-nullifier");
  });

  it("sets updated_at when claiming", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    const task = await seedTask(testDb);

    const caller = makeTaskCaller(workerSession());
    const result = await caller.claim({ taskId: task.id });

    // updated_at is set (not null) and is a Date — PGLite clock may differ from Node
    expect(result.updated_at).toBeTruthy();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it("throws BAD_REQUEST if task is already claimed (sequential)", async () => {
    await seedClient(testDb);
    await seedWorker(testDb, "worker-1");
    await seedWorker(testDb, "worker-2");
    const task = await seedTask(testDb);

    const caller1 = makeTaskCaller(workerSession("worker-1"));
    await caller1.claim({ taskId: task.id });

    // Sequential second claim: task is already "claimed", hits the first status check → BAD_REQUEST
    const caller2 = makeTaskCaller(workerSession("worker-2"));
    await expect(caller2.claim({ taskId: task.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: /not available/,
    });
  });

  it("throws FORBIDDEN if session role is not worker", async () => {
    await seedClient(testDb);
    const task = await seedTask(testDb);

    const caller = makeTaskCaller(clientSession());
    await expect(caller.claim({ taskId: task.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: /Only workers/,
    });
  });
});

// ─── task.markComplete ───────────────────────────────────────────────────────

describe("task.markComplete", () => {
  it("sets status=completed for assigned worker", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    const task = await seedTask(testDb, {
      status: "claimed",
      worker_nullifier: "test-worker-nullifier",
    });

    const caller = makeTaskCaller(workerSession());
    const result = await caller.markComplete({ taskId: task.id });

    expect(result.status).toBe("completed");
  });

  it("throws FORBIDDEN if not the assigned worker", async () => {
    await seedWorker(testDb, "other-worker");
    const task = await seedTask(testDb, {
      status: "claimed",
      worker_nullifier: "assigned-worker",
    });

    const caller = makeTaskCaller(workerSession("other-worker"));
    await expect(caller.markComplete({ taskId: task.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: /Only the assigned worker/,
    });
  });

  it("throws BAD_REQUEST if task is not in claimed status", async () => {
    await seedWorker(testDb);
    const task = await seedTask(testDb, {
      status: "open",
      worker_nullifier: "test-worker-nullifier",
    });

    const caller = makeTaskCaller(workerSession());
    await expect(caller.markComplete({ taskId: task.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: /claimed status/,
    });
  });
});

// ─── task.validate ───────────────────────────────────────────────────────────

describe("task.validate", () => {
  it("sets status=validated and stores payment_tx_id", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    const task = await seedTask(testDb, {
      status: "completed",
      worker_nullifier: "test-worker-nullifier",
    });

    const caller = makeTaskCaller(clientSession());
    const result = await caller.validate({ taskId: task.id });

    expect(result.status).toBe("validated");
    expect(result.payment_tx_id).toBe("0.0.1234@1700000001.000");
    expect(result.hashscanLink).toContain("hashscan.io");
  });

  it("credits worker hbar_balance after validation", async () => {
    await seedClient(testDb);
    await seedWorker(testDb, "test-worker-nullifier", "0.0.9999");
    const task = await seedTask(testDb, {
      status: "completed",
      budget_hbar: 10,
      worker_nullifier: "test-worker-nullifier",
    });

    const caller = makeTaskCaller(clientSession());
    await caller.validate({ taskId: task.id });

    const worker = await testDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.nullifier, "test-worker-nullifier"),
    });
    expect(worker?.hbar_balance).toBe(10);
  });

  it("increments worker tasks_completed after validation", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    const task = await seedTask(testDb, {
      status: "completed",
      worker_nullifier: "test-worker-nullifier",
    });

    const caller = makeTaskCaller(clientSession());
    await caller.validate({ taskId: task.id });

    const worker = await testDb.query.users.findFirst({
      where: (u, { eq }) => eq(u.nullifier, "test-worker-nullifier"),
    });
    expect(worker?.tasks_completed).toBe(1);
  });

  it("throws FORBIDDEN for agent tasks", async () => {
    await seedClient(testDb);
    const task = await seedTask(testDb, {
      status: "completed",
      client_type: "agent",
      client_nullifier: null,
      client_agent_wallet: "0xabcdef1234567890abcdef1234567890abcdef12",
    });

    const caller = makeTaskCaller(clientSession());
    await expect(caller.validate({ taskId: task.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: /MCP API/,
    });
  });

  it("throws FORBIDDEN if not the task client", async () => {
    await seedClient(testDb, "other-client");
    await seedWorker(testDb);
    const task = await seedTask(testDb, {
      status: "completed",
      worker_nullifier: "test-worker-nullifier",
      client_nullifier: "real-client-nullifier",
    });

    const caller = makeTaskCaller(clientSession("other-client"));
    await expect(caller.validate({ taskId: task.id })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: /Only the task client/,
    });
  });

  it("throws BAD_REQUEST if status is not completed", async () => {
    await seedClient(testDb);
    const task = await seedTask(testDb, { status: "open" });

    const caller = makeTaskCaller(clientSession());
    await expect(caller.validate({ taskId: task.id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: /completed status/,
    });
  });
});

// ─── task.myTasks ────────────────────────────────────────────────────────────

describe("task.myTasks", () => {
  it("returns only tasks claimed by the current worker", async () => {
    await seedClient(testDb);
    await seedWorker(testDb);
    await seedWorker(testDb, "other-worker");

    await seedTask(testDb, { status: "claimed", worker_nullifier: "test-worker-nullifier" });
    await seedTask(testDb, { status: "claimed", worker_nullifier: "other-worker" });
    await seedTask(testDb, { status: "open" });

    const caller = makeTaskCaller(workerSession());
    const result = await caller.myTasks();

    expect(result).toHaveLength(1);
    expect(result[0].worker_nullifier).toBe("test-worker-nullifier");
  });

  it("returns empty array for worker with no tasks", async () => {
    await seedWorker(testDb);

    const caller = makeTaskCaller(workerSession());
    const result = await caller.myTasks();

    expect(result).toHaveLength(0);
  });
});

// ─── task.myPostedTasks ──────────────────────────────────────────────────────

describe("task.myPostedTasks", () => {
  it("returns only tasks posted by the current client", async () => {
    await seedClient(testDb);
    await seedClient(testDb, "other-client");

    await seedTask(testDb, { client_nullifier: "test-client-nullifier" });
    await seedTask(testDb, { client_nullifier: "test-client-nullifier" });
    await seedTask(testDb, { client_nullifier: "other-client" });

    const caller = makeTaskCaller(clientSession());
    const result = await caller.myPostedTasks();

    expect(result).toHaveLength(2);
    result.forEach((t) => expect(t.client_nullifier).toBe("test-client-nullifier"));
  });

  it("returns empty array for client with no posted tasks", async () => {
    await seedClient(testDb);

    const caller = makeTaskCaller(clientSession());
    const result = await caller.myPostedTasks();

    expect(result).toHaveLength(0);
  });
});
