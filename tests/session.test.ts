import { describe, it, expect } from "vitest";
import { createSession, verifySession } from "@/lib/core/session";
import type { SessionPayload } from "@/lib/schemas";

const payload: SessionPayload = {
  nullifier: "0xabc123",
  role: "worker",
  userId: "user-uuid-1",
};

describe("createSession", () => {
  it("returns a non-empty string token", async () => {
    const token = await createSession(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("produces a valid JWT (three dot-separated segments)", async () => {
    const token = await createSession(payload);
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifySession", () => {
  it("returns the original payload for a valid token", async () => {
    const token = await createSession(payload);
    const result = await verifySession(token);
    expect(result).not.toBeNull();
    expect(result?.nullifier).toBe(payload.nullifier);
    expect(result?.role).toBe(payload.role);
    expect(result?.userId).toBe(payload.userId);
  });

  it("returns null for a tampered token", async () => {
    const token = await createSession(payload);
    const [header, body, sig] = token.split(".");
    const tampered = `${header}.${body}.invalidsignature`;
    const result = await verifySession(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a random string", async () => {
    const result = await verifySession("not-a-jwt-at-all");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await verifySession("");
    expect(result).toBeNull();
  });
});
