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
    const result = await verifyWorldIDProof({
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

    const r1 = await verifyWorldIDProof({ mock: true, timestamp: 1000 });
    const r2 = await verifyWorldIDProof({ mock: true, timestamp: 2000 });

    expect(r1.nullifier).not.toBe(r2.nullifier);
  });

  it("returns same nullifier for identical payloads (deterministic)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const payload = { mock: true, action: "register", timestamp: 42 };

    const r1 = await verifyWorldIDProof(payload);
    const r2 = await verifyWorldIDProof(payload);

    expect(r1.nullifier).toBe(r2.nullifier);
  });
});

// ─── Session lifecycle after registration ─────────────────────────────────────
describe("Session lifecycle — post-registration", () => {
  it("creates a verifiable worker session after mock proof", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const { verifyWorldIDProof } = await import("@/lib/core/worldid");
    const { createSession, verifySession } = await import("@/lib/core/session");

    const { nullifier } = await verifyWorldIDProof({
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

// ─── AC #2: completeRegistration — DB persistence ─────────────────────────────
describe("completeRegistration — registration persistence (AC #2)", () => {
  it("creates user + nullifier and returns a token on success", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const mockUser = {
      id: "user-abc",
      nullifier: "mock-nullifier-test",
      role: "worker" as const,
      hbar_balance: 0,
      tasks_completed: 0,
      hedera_account_id: null,
      created_at: new Date(),
    };

    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockReturning = vi.fn().mockResolvedValue([mockUser]);
    const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockOnConflictDoNothing = vi.fn().mockResolvedValue([]);
    const mockValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
      onConflictDoNothing: mockOnConflictDoNothing,
    });
    const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    vi.doMock("@/lib/db", () => ({
      db: {
        query: { nullifiers: { findFirst: mockFindFirst } },
        insert: mockInsert,
      },
    }));

    const { completeRegistration } = await import("@/lib/core/auth-register");
    const result = await completeRegistration(
      { mock: true, action: "register", timestamp: 123 },
      "worker"
    );

    expect(result.user.id).toBe("user-abc");
    expect(result.nullifier).toMatch(/^mock-nullifier-/);
    expect(result.token).toBeTruthy();
    // Two inserts: users table + nullifiers table
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("throws HumanAlreadyRegisteredError on duplicate nullifier (AC #2)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MOCK_WORLDID", "true");

    const mockFindFirst = vi.fn().mockResolvedValue({
      nullifier: "mock-nullifier-test",
      action: "register",
    });

    vi.doMock("@/lib/db", () => ({
      db: {
        query: { nullifiers: { findFirst: mockFindFirst } },
        insert: vi.fn(),
      },
    }));

    const { completeRegistration, HumanAlreadyRegisteredError } = await import(
      "@/lib/core/auth-register"
    );

    await expect(
      completeRegistration({ mock: true, action: "register", timestamp: 456 }, "worker")
    ).rejects.toThrow(HumanAlreadyRegisteredError);
  });
});

// ─── AC #4: protectedProcedure — session gate ────────────────────────────────
describe("protectedProcedure — rejects unauthorized requests (AC #4)", () => {
  it("throws UNAUTHORIZED when session is null", async () => {
    const { router, protectedProcedure } = await import("@/lib/trpc/server");

    const testRouter = router({
      ping: protectedProcedure.query(() => "pong"),
    });

    // Create caller with no session (simulates missing or invalid cookie)
    const caller = testRouter.createCaller({ session: null, req: {} as never });

    await expect(caller.ping()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows access when a valid session is present", async () => {
    const { router, protectedProcedure } = await import("@/lib/trpc/server");

    const testRouter = router({
      ping: protectedProcedure.query(() => "pong"),
    });

    const caller = testRouter.createCaller({
      session: { nullifier: "0xabc", role: "worker", userId: "u1" },
      req: {} as never,
    });

    await expect(caller.ping()).resolves.toBe("pong");
  });
});
