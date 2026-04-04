import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyWorldIDProof (mock mode)", () => {
  it("returns a mock nullifier without calling World ID API", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    // Dynamic import so env stub is in place before module code runs
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const result = await verifyWorldIDProof("rp_test", { proof: "fake" });
    expect(result.verified).toBe(true);
    expect(result.nullifier).toMatch(/^mock-nullifier-\d+$/);
  });

  it("returns different nullifiers on each call (timestamp-based)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const r1 = await verifyWorldIDProof("rp_test", {});
    await new Promise((r) => setTimeout(r, 2));
    const r2 = await verifyWorldIDProof("rp_test", {});

    expect(r1.nullifier).not.toBe(r2.nullifier);
  });
});
