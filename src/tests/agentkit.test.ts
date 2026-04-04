import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const VALID_WALLET = "0xAbCd1234567890AbCd1234567890AbCd12345678";
const VALID_HEADER = `AgentKit ${VALID_WALLET}`;

describe("verifyAgentRequest — production mode", () => {
  it("accepts a valid header and returns the wallet address", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { verifyAgentRequest } = await import("@/lib/core/agentkit");

    const identity = await verifyAgentRequest(VALID_HEADER);

    expect(identity.walletAddress).toBe(VALID_WALLET);
    expect(identity.humanOwnerNullifier).toBeNull();
    expect(identity.agentBookVerified).toBe(false);
  });

  it("throws AgentAuthError when header is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(verifyAgentRequest("")).rejects.toBeInstanceOf(AgentAuthError);
  });

  it("throws AgentAuthError for malformed header (missing 0x prefix)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(
      verifyAgentRequest("AgentKit AbCd1234567890AbCd1234567890AbCd12345678")
    ).rejects.toBeInstanceOf(AgentAuthError);
  });

  it("throws AgentAuthError for wallet address that is too short", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(
      verifyAgentRequest("AgentKit 0xAbCd1234")
    ).rejects.toBeInstanceOf(AgentAuthError);
  });

  it("throws AgentAuthError for wrong prefix (no 'AgentKit ')", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(
      verifyAgentRequest(`Bearer ${VALID_WALLET}`)
    ).rejects.toBeInstanceOf(AgentAuthError);
  });
});

describe("verifyAgentRequest — mock mode", () => {
  it("accepts a valid header without real SDK calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyAgentRequest } = await import("@/lib/core/agentkit");

    const identity = await verifyAgentRequest(VALID_HEADER);

    expect(identity.walletAddress).toBe(VALID_WALLET);
    // Story 2.2: mock mode now returns a deterministic AgentBook nullifier
    // and correctly handles casing (normalized to lowercase)
    expect(identity.humanOwnerNullifier).toBe("mock-owner-nullifier-abcd1234");
    expect(identity.agentBookVerified).toBe(true);
  });

  it("accepts case-insensitive header and wallet", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyAgentRequest } = await import("@/lib/core/agentkit");

    const lowerHeader = VALID_HEADER.toLowerCase();
    const identity = await verifyAgentRequest(lowerHeader);

    expect(identity.walletAddress.toLowerCase()).toBe(VALID_WALLET.toLowerCase());
    expect(identity.humanOwnerNullifier).toBe("mock-owner-nullifier-abcd1234");
  });

  it("still throws AgentAuthError on malformed header in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(
      verifyAgentRequest("not-a-valid-header")
    ).rejects.toBeInstanceOf(AgentAuthError);
  });
});

describe("lookupAgentBookOwner — mock mode", () => {
  it("returns a deterministic nullifier and verified status", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { lookupAgentBookOwner } = await import("@/lib/core/agentkit");

    const result = await lookupAgentBookOwner(VALID_WALLET);
    expect(result.nullifier).toBe("mock-owner-nullifier-abcd1234");
    expect(result.status).toBe("verified");
  });

  it("normalizes wallet address casing for determinism", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { lookupAgentBookOwner } = await import("@/lib/core/agentkit");

    const upper = VALID_WALLET.toUpperCase();
    const lower = VALID_WALLET.toLowerCase();
    
    const resUpper = await lookupAgentBookOwner(upper);
    const resLower = await lookupAgentBookOwner(lower);
    
    expect(resUpper.nullifier).toBe(resLower.nullifier);
    expect(resUpper.nullifier).toBe("mock-owner-nullifier-abcd1234");
  });

  it("returns different nullifiers for different wallets", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { lookupAgentBookOwner } = await import("@/lib/core/agentkit");

    const other = "0x1111111111111111111111111111111111111111";
    const a = await lookupAgentBookOwner(VALID_WALLET);
    const b = await lookupAgentBookOwner(other);
    expect(a.nullifier).not.toBe(b.nullifier);
  });
});

describe("lookupAgentBookOwner — production mode", () => {
  it("returns a fail-soft result without throwing when lookup cannot verify the wallet", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "false");
    const { lookupAgentBookOwner } = await import("@/lib/core/agentkit");

    // Production lookup is fail-soft: unresolved wallets return no nullifier and
    // never throw, even if the verifier cannot confirm the registration.
    const result = await lookupAgentBookOwner(VALID_WALLET);
    expect(result.nullifier).toBeNull();
    expect(["not-registered", "offline"]).toContain(result.status);
  });
});

describe("verifyAgentRequest — mock mode with AgentBook", () => {
  it("returns agentBookVerified: true in mock mode (Story 2.2)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyAgentRequest } = await import("@/lib/core/agentkit");

    const identity = await verifyAgentRequest(VALID_HEADER);

    expect(identity.agentBookVerified).toBe(true);
    expect(identity.humanOwnerNullifier).toBe("mock-owner-nullifier-abcd1234");
  });
});

describe("agentKitHeaderSchema", () => {
  it("validates correct header format (case-insensitive)", async () => {
    const { agentKitHeaderSchema } = await import("@/lib/schemas");
    expect(agentKitHeaderSchema.safeParse(VALID_HEADER).success).toBe(true);
    expect(agentKitHeaderSchema.safeParse(VALID_HEADER.toLowerCase()).success).toBe(true);
  });

  it("rejects header without AgentKit prefix", async () => {
    const { agentKitHeaderSchema } = await import("@/lib/schemas");
    expect(agentKitHeaderSchema.safeParse(VALID_WALLET).success).toBe(false);
  });

  it("rejects wallet with 39 hex chars (too short)", async () => {
    const { agentKitHeaderSchema } = await import("@/lib/schemas");
    expect(
      agentKitHeaderSchema.safeParse("AgentKit 0xAbCd1234567890AbCd1234567890AbCd1234").success
    ).toBe(false);
  });

  it("rejects wallet with 41 hex chars (too long)", async () => {
    const { agentKitHeaderSchema } = await import("@/lib/schemas");
    expect(
      agentKitHeaderSchema.safeParse("AgentKit 0xAbCd1234567890AbCd1234567890AbCd123456").success
    ).toBe(false);
  });
});
