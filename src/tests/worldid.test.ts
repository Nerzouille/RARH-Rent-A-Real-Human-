import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("verifyWorldIDProof (mock mode)", () => {
  it("returns a mock nullifier without calling World ID API", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const result = await verifyWorldIDProof("rp_test", { proof: "fake" });
    expect(result.verified).toBe(true);
    expect(result.nullifier).toMatch(/^mock-nullifier-/);
  });

  it("returns deterministic nullifier for same input", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const input = { proof: "test-proof", merkle_root: "0xabc" };
    const r1 = await verifyWorldIDProof("rp_test", input);
    const r2 = await verifyWorldIDProof("rp_test", input);

    expect(r1.nullifier).toBe(r2.nullifier);
  });

  it("returns different nullifiers for different inputs", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const r1 = await verifyWorldIDProof("rp_test", { proof: "proof-a" });
    const r2 = await verifyWorldIDProof("rp_test", { proof: "proof-b" });

    expect(r1.nullifier).not.toBe(r2.nullifier);
  });

  it("returns verified: true in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const result = await verifyWorldIDProof("any-rp", null);
    expect(result.verified).toBe(true);
  });
});
