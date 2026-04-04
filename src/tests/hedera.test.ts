import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { hashscanUrl, getOperatorAccountId } from "@/lib/core/hedera";

describe("hashscanUrl", () => {
  it("replaces @ with - and preserves all dots", () => {
    const url = hashscanUrl("0.0.12345@1234567890.123456789");
    expect(url).toBe(
      "https://hashscan.io/testnet/transaction/0.0.12345-1234567890.123456789"
    );
  });

  it("produces a URL starting with the Hashscan testnet base", () => {
    const url = hashscanUrl("0.0.1@1000000000.000000000");
    expect(url.startsWith("https://hashscan.io/testnet/transaction/")).toBe(true);
  });

  it("handles transaction IDs without @ gracefully", () => {
    const url = hashscanUrl("plain-tx-id");
    expect(url).toBe("https://hashscan.io/testnet/transaction/plain-tx-id");
  });
});

describe("getOperatorAccountId", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns the configured account ID when env vars are set", () => {
    process.env.HEDERA_ACCOUNT_ID = "0.0.99999";
    process.env.HEDERA_PRIVATE_KEY = "0xfakekey";
    expect(getOperatorAccountId()).toBe("0.0.99999");
  });

  it("throws when HEDERA_ACCOUNT_ID is missing", () => {
    delete process.env.HEDERA_ACCOUNT_ID;
    process.env.HEDERA_PRIVATE_KEY = "0xfakekey";
    expect(() => getOperatorAccountId()).toThrow("HEDERA_ACCOUNT_ID is not set");
  });

  it("throws when HEDERA_ACCOUNT_ID format is invalid", () => {
    process.env.HEDERA_ACCOUNT_ID = "invalid-id";
    process.env.HEDERA_PRIVATE_KEY = "0xfakekey";
    expect(() => getOperatorAccountId()).toThrow("Invalid HEDERA_ACCOUNT_ID format");
  });

  it("throws when HEDERA_PRIVATE_KEY is missing", () => {
    process.env.HEDERA_ACCOUNT_ID = "0.0.99999";
    delete process.env.HEDERA_PRIVATE_KEY;
    expect(() => getOperatorAccountId()).toThrow("HEDERA_PRIVATE_KEY is not set");
  });
});
