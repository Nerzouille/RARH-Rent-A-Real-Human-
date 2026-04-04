import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Mock mode end-to-end flow", () => {
  it("mock RP context returns valid structure", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    // Simulate what /api/rp-context returns in mock mode
    const mockContext = {
      rp_id: "mock-rp-id",
      nonce: `mock-nonce-${Date.now()}`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      signature: "mock-signature",
    };

    const { RPContextSchema } = await import("@/lib/schemas");
    expect(() => RPContextSchema.parse(mockContext)).not.toThrow();
  });

  it("mock verify -> create session -> verify session roundtrip", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const { createSession, verifySession } = await import("@/lib/core/session");

    // Step 1: Verify mock proof
    const { nullifier, verified } = await verifyWorldIDProof("mock-rp-id", {
      proof: "demo-user",
    });
    expect(verified).toBe(true);
    expect(nullifier).toBeTruthy();

    // Step 2: Create session
    const token = await createSession({
      nullifier,
      role: "worker",
      userId: "test-user-id",
    });
    expect(token).toBeTruthy();

    // Step 3: Verify session
    const session = await verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.nullifier).toBe(nullifier);
    expect(session?.role).toBe("worker");
  });

  it("same mock user gets same nullifier (deterministic)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const proof = { proof: "kenji-demo", merkle_root: "0x123" };
    const r1 = await verifyWorldIDProof("mock-rp-id", proof);
    const r2 = await verifyWorldIDProof("mock-rp-id", proof);

    expect(r1.nullifier).toBe(r2.nullifier);
  });
});
