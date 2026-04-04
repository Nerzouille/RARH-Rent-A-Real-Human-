import { describe, it, expect } from "vitest";
import {
  WorldIDProofSchema,
  RPContextSchema,
  CreateTaskSchema,
  AgentCreateTaskSchema,
  TaskStatusSchema,
  SessionPayloadSchema,
} from "@/lib/schemas";

describe("WorldIDProofSchema", () => {
  const valid = {
    merkle_root: "0xabc",
    proof: "0xproof",
    verification_level: "orb",
  };

  it("accepts minimal valid proof", () => {
    expect(() => WorldIDProofSchema.parse(valid)).not.toThrow();
  });

  it("accepts proof as array", () => {
    expect(() =>
      WorldIDProofSchema.parse({ ...valid, proof: ["0xa", "0xb"] })
    ).not.toThrow();
  });

  it("rejects missing merkle_root", () => {
    const { merkle_root: _, ...rest } = valid;
    expect(() => WorldIDProofSchema.parse(rest)).toThrow();
  });
});

describe("CreateTaskSchema", () => {
  const valid = {
    title: "Test task title",
    description: "This is a valid task description",
    budget_hbar: 10,
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };

  it("accepts valid task", () => {
    expect(() => CreateTaskSchema.parse(valid)).not.toThrow();
  });

  it("rejects title shorter than 5 chars", () => {
    expect(() => CreateTaskSchema.parse({ ...valid, title: "Hi" })).toThrow();
  });

  it("rejects title longer than 100 chars", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, title: "x".repeat(101) })
    ).toThrow();
  });

  it("rejects description shorter than 10 chars", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, description: "Too short" })
    ).toThrow();
  });

  it("rejects non-integer budget", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, budget_hbar: 1.5 })
    ).toThrow();
  });

  it("rejects zero budget", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, budget_hbar: 0 })
    ).toThrow();
  });

  it("rejects negative budget", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, budget_hbar: -5 })
    ).toThrow();
  });

  it("rejects invalid deadline format", () => {
    expect(() =>
      CreateTaskSchema.parse({ ...valid, deadline: "not-a-date" })
    ).toThrow();
  });
});

describe("AgentCreateTaskSchema", () => {
  const valid = {
    title: "Agent task title",
    description: "This is a valid agent task description",
    budget_hbar: 5,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    agent_wallet: "0xwallet",
    agentkit_signature: "0xsig",
  };

  it("accepts valid agent task", () => {
    expect(() => AgentCreateTaskSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing agent_wallet", () => {
    const { agent_wallet: _, ...rest } = valid;
    expect(() => AgentCreateTaskSchema.parse(rest)).toThrow();
  });
});

describe("TaskStatusSchema", () => {
  const validStatuses = ["open", "claimed", "completed", "validated", "expired", "refunded"];

  it.each(validStatuses)("accepts status '%s'", (status) => {
    expect(() => TaskStatusSchema.parse(status)).not.toThrow();
  });

  it("rejects unknown status", () => {
    expect(() => TaskStatusSchema.parse("pending")).toThrow();
  });
});

describe("SessionPayloadSchema", () => {
  const valid = {
    nullifier: "0xnull",
    role: "worker" as const,
    userId: "user-uuid",
  };

  it("accepts valid payload", () => {
    expect(() => SessionPayloadSchema.parse(valid)).not.toThrow();
  });

  it.each(["worker", "client", "admin"])("accepts role '%s'", (role) => {
    expect(() => SessionPayloadSchema.parse({ ...valid, role })).not.toThrow();
  });

  it("rejects unknown role", () => {
    expect(() =>
      SessionPayloadSchema.parse({ ...valid, role: "superuser" })
    ).toThrow();
  });
});

describe("RPContextSchema", () => {
  const valid = {
    rp_id: "rp_abc",
    nonce: "nonce123",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60000).toISOString(),
    signature: "0xsig",
  };

  it("accepts valid context", () => {
    expect(() => RPContextSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing signature", () => {
    const { signature: _, ...rest } = valid;
    expect(() => RPContextSchema.parse(rest)).toThrow();
  });
});
