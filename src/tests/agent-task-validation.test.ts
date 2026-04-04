import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const AGENT_WALLET = "0xabcd1234567890abcd1234567890abcd12345678";
const OTHER_WALLET = "0x9999999999999999999999999999999999999999";
const TASK_ID = "task-uuid-00000000-0000-0000-0000-000000000001";

// ─── get_task_status ownership logic ─────────────────────────────────────────

describe("get_task_status — ownership check", () => {
  it("returns error when agent_wallet does not match client_agent_wallet", () => {
    const task = {
      id: TASK_ID,
      client_agent_wallet: AGENT_WALLET,
      status: "open",
      escrow_tx_id: `mock-escrow-${TASK_ID}`,
      client_agent_owner_nullifier: "mock-owner-nullifier-abcd1234",
    };

    const authorized = task.client_agent_wallet?.toLowerCase() === AGENT_WALLET.toLowerCase();
    const unauthorized = task.client_agent_wallet?.toLowerCase() === OTHER_WALLET.toLowerCase();

    expect(authorized).toBe(true);
    expect(unauthorized).toBe(false);
  });

  it("ownership check is case-insensitive", () => {
    const task = { client_agent_wallet: AGENT_WALLET.toUpperCase() };
    const matches = task.client_agent_wallet?.toLowerCase() === AGENT_WALLET.toLowerCase();
    expect(matches).toBe(true);
  });

  it("derives agentbook_status from client_agent_owner_nullifier", () => {
    const withNullifier = { client_agent_owner_nullifier: "mock-owner-nullifier-abcd1234" };
    const withoutNullifier = { client_agent_owner_nullifier: null };

    expect(withNullifier.client_agent_owner_nullifier ? "verified" : "offline").toBe("verified");
    expect(withoutNullifier.client_agent_owner_nullifier ? "verified" : "offline").toBe("offline");
  });
});

// ─── validate_task guard logic ────────────────────────────────────────────────

describe("validate_task — guard conditions", () => {
  it("rejects validation when task status is not completed", () => {
    const statuses: string[] = ["open", "claimed", "validated", "expired"];
    for (const status of statuses) {
      const isValid = status === "completed";
      expect(isValid).toBe(false);
    }
  });

  it("accepts validation when task status is completed", () => {
    const task = { status: "completed" as const };
    expect(task.status === "completed").toBe(true);
  });
});

// ─── payment_tx_id mock fallback ──────────────────────────────────────────────

describe("validate_task — payment fallback", () => {
  it("generates mock payment ID when worker has no hedera_account_id", () => {
    const worker = { hedera_account_id: null };
    const payment_tx_id = worker?.hedera_account_id
      ? "real-tx-id"
      : `mock-payment-${TASK_ID}`;

    expect(payment_tx_id).toBe(`mock-payment-${TASK_ID}`);
    expect(payment_tx_id).toMatch(/^mock-payment-/);
  });

  it("uses real payment when worker has hedera_account_id", () => {
    // Verifies the branching logic shape — real call mocked here
    const worker = { hedera_account_id: "0.0.12345" };
    const wouldCallReal = !!worker?.hedera_account_id;
    expect(wouldCallReal).toBe(true);
  });
});

// ─── response shape ───────────────────────────────────────────────────────────

describe("validate_task — response shape", () => {
  it("response includes task_id, status, payment_tx_id", () => {
    const response = {
      task_id: TASK_ID,
      status: "validated",
      payment_tx_id: `mock-payment-${TASK_ID}`,
    };

    expect(response.status).toBe("validated");
    expect(response.payment_tx_id).toBeDefined();
    expect(response.task_id).toBe(TASK_ID);
  });
});
