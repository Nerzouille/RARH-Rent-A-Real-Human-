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
    expect(identity.humanOwnerNullifier).toBeNull();
    expect(identity.agentBookVerified).toBe(false);
  });

  it("still throws AgentAuthError on malformed header in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");
    const { verifyAgentRequest, AgentAuthError } = await import("@/lib/core/agentkit");

    await expect(
      verifyAgentRequest("not-a-valid-header")
    ).rejects.toBeInstanceOf(AgentAuthError);
  });
});

describe("agentKitHeaderSchema", () => {
  it("validates correct header format", async () => {
    const { agentKitHeaderSchema } = await import("@/lib/schemas");
    expect(agentKitHeaderSchema.safeParse(VALID_HEADER).success).toBe(true);
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
