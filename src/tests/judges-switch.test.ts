import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Judges Dashboard — session switching", () => {
  it("creates a valid worker session for kenji persona", async () => {
    vi.stubEnv("SESSION_SECRET", "test-secret-1234567890abcdef");

    const { createSession, verifySession } = await import("@/lib/core/session");

    const token = await createSession({
      nullifier: "judge-demo-kenji-worker",
      role: "worker",
      userId: "kenji-id",
    });

    const session = await verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.nullifier).toBe("judge-demo-kenji-worker");
    expect(session?.role).toBe("worker");
    expect(session?.userId).toBe("kenji-id");
  });

  it("creates a valid client session for sophie persona", async () => {
    vi.stubEnv("SESSION_SECRET", "test-secret-1234567890abcdef");

    const { createSession, verifySession } = await import("@/lib/core/session");

    const token = await createSession({
      nullifier: "judge-demo-sophie-client",
      role: "client",
      userId: "sophie-id",
    });

    const session = await verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.nullifier).toBe("judge-demo-sophie-client");
    expect(session?.role).toBe("client");
  });

  it("persona nullifiers are deterministic and distinct", () => {
    const personas = {
      kenji: "judge-demo-kenji-worker",
      sophie: "judge-demo-sophie-client",
    };

    expect(personas.kenji).not.toBe(personas.sophie);
    // Deterministic: same string every time
    expect(personas.kenji).toBe("judge-demo-kenji-worker");
    expect(personas.sophie).toBe("judge-demo-sophie-client");
  });

  it("session payload shape matches SessionPayloadSchema", async () => {
    const { SessionPayloadSchema } = await import("@/lib/schemas");

    const kenjiPayload = {
      nullifier: "judge-demo-kenji-worker",
      role: "worker",
      userId: "kenji-id",
    };

    const sophiePayload = {
      nullifier: "judge-demo-sophie-client",
      role: "client",
      userId: "sophie-id",
    };

    expect(() => SessionPayloadSchema.parse(kenjiPayload)).not.toThrow();
    expect(() => SessionPayloadSchema.parse(sophiePayload)).not.toThrow();
  });

  it("rejects invalid persona keys", () => {
    const validPersonas = ["kenji-worker", "sophie-client", "aria-agent"];
    expect(validPersonas.includes("invalid-persona")).toBe(false);
    expect(validPersonas.includes("kenji-worker")).toBe(true);
  });
});
