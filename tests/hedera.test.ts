import { describe, it, expect } from "vitest";
import { hashscanUrl } from "@/lib/core/hedera";

describe("hashscanUrl", () => {
  it("replaces @ with - and the first . with -", () => {
    // Implementation does: replace("@", "-").replace(".", "-") — only first . is replaced
    const url = hashscanUrl("0.0.12345@1234567890.123456789");
    expect(url).toBe(
      "https://hashscan.io/testnet/transaction/0-0.12345-1234567890.123456789"
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
