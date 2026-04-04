import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("verifyWorldIDProof (mock mode)", () => {
  it("returns a mock nullifier without calling World ID API", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const result = await verifyWorldIDProof({ proof: "fake" });
    expect(result.verified).toBe(true);
    expect(result.nullifier).toMatch(/^mock-nullifier-/);
  });

  it("returns deterministic nullifier for same input", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const input = { proof: "test-proof", merkle_root: "0xabc" };
    const r1 = await verifyWorldIDProof(input);
    const r2 = await verifyWorldIDProof(input);

    expect(r1.nullifier).toBe(r2.nullifier);
  });

  it("returns different nullifiers for different inputs", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const r1 = await verifyWorldIDProof({ proof: "proof-a" });
    const r2 = await verifyWorldIDProof({ proof: "proof-b" });

    expect(r1.nullifier).not.toBe(r2.nullifier);
  });

  it("returns verified: true in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyWorldIDProof } = await import("@/lib/core/worldid");

    const result = await verifyWorldIDProof(null);
    expect(result.verified).toBe(true);
  });
});

// ─── AC #1: Real-mode response validation — fails closed ──────────────────────
describe("verifyWorldIDProof (real mode) — response validation", () => {
  it("throws when World API returns non-OK status", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    vi.stubEnv("WORLD_RP_ID", "test-rp-id");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_proof" }),
    }));

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    await expect(verifyWorldIDProof({ proof: "bad" })).rejects.toThrow(
      "World ID verification failed"
    );
  });

  it("throws when World API returns success but no nullifier", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    vi.stubEnv("WORLD_RP_ID", "test-rp-id");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ some_other_field: "no_nullifier_here" }),
    }));

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    await expect(verifyWorldIDProof({ proof: "bad" })).rejects.toThrow(
      "invalid or missing nullifier"
    );
  });

  it("throws when WORLD_RP_ID env var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    // WORLD_RP_ID is not set

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    await expect(verifyWorldIDProof({ proof: "any" })).rejects.toThrow(
      "WORLD_RP_ID is not configured"
    );
  });

  it("uses the server-configured RP ID, not any caller-provided value", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    vi.stubEnv("WORLD_RP_ID", "server-rp-id");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nullifier: "real-nullifier-abc" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    await verifyWorldIDProof({ proof: "test" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("server-rp-id"),
      expect.any(Object)
    );
  });
});
