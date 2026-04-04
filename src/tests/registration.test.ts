import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// ─── verifyWorldIDProof — mock mode behaviour ─────────────────────────────────
describe("verifyWorldIDProof — mock mode (registration flow)", () => {
  it("accepts any payload in mock mode and returns a nullifier", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const result = await verifyWorldIDProof("mock-rp-id", {
      mock: true,
      action: "register",
      timestamp: Date.now(),
    });

    expect(result.verified).toBe(true);
    expect(result.nullifier).toBeTruthy();
    expect(result.nullifier).toMatch(/^mock-nullifier-/);
  });

  it("returns different nullifiers for payloads with different timestamps (demo looping)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const r1 = await verifyWorldIDProof("mock-rp-id", { mock: true, timestamp: 1000 });
    const r2 = await verifyWorldIDProof("mock-rp-id", { mock: true, timestamp: 2000 });

    // Different payloads → different nullifiers (each demo loop gets a fresh identity)
    expect(r1.nullifier).not.toBe(r2.nullifier);
  });

  it("returns same nullifier for identical payloads (deterministic)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const payload = { mock: true, action: "register", timestamp: 42 };

    const r1 = await verifyWorldIDProof("mock-rp-id", payload);
    const r2 = await verifyWorldIDProof("mock-rp-id", payload);

    expect(r1.nullifier).toBe(r2.nullifier);
  });
});

// ─── Session lifecycle after registration ─────────────────────────────────────
describe("Session lifecycle — post-registration", () => {
  it("creates a verifiable worker session after mock proof", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const { createSession, verifySession } = await import("@/lib/core/session");

    const { nullifier } = await verifyWorldIDProof("mock-rp-id", {
      mock: true,
      action: "register",
      timestamp: 99999,
    });

    const token = await createSession({ nullifier, role: "worker", userId: "test-user-1" });
    const session = await verifySession(token);

    expect(session).not.toBeNull();
    expect(session?.nullifier).toBe(nullifier);
    expect(session?.role).toBe("worker");
  });
});

// ─── Integration stubs (require DB) ──────────────────────────────────────────
describe("auth.register tRPC — integration stubs", () => {
  it.todo("auth.register — creates user + nullifier in DB with mock IDKit payload");
  it.todo("auth.register — sets httpOnly session cookie on success");
  it.todo("auth.register — throws HUMAN_ALREADY_REGISTERED on duplicate nullifier");
  it.todo("auth.register — redirects to /tasks after success (E2E)");
});
