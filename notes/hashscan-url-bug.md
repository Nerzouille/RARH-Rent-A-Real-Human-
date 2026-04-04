# Bug: `hashscanUrl` corrupts the account ID

**File:** `lib/core/hedera.ts` — `hashscanUrl()`

## Problem

The current implementation:

```ts
const formatted = txId.replace("@", "-").replace(".", "-");
```

`String.replace` with a string argument only replaces the **first** match. So for a typical Hedera TX ID like `0.0.12345@1234567890.000000000`:

1. After `replace("@", "-")` → `0.0.12345-1234567890.000000000`
2. After `replace(".", "-")` → `0-0.12345-1234567890.000000000` ← first `.` in account ID gets clobbered

The resulting URL is wrong — Hashscan won't resolve it.

## Expected behavior

Only the `@` separator should become `-`. The dots in the account ID (`0.0.12345`) must be preserved:

```
0.0.12345@1234567890.000000000
→ 0.0.12345-1234567890.000000000
```

## Fix

```ts
export function hashscanUrl(txId: string): string {
  const formatted = txId.replace("@", "-");
  return `https://hashscan.io/testnet/transaction/${formatted}`;
}
```

## Notes

- Caught by the `tests/hedera.test.ts` unit test, which documents the current (broken) behavior.
- The test assertion should be updated once the fix is applied.
- Owner: whoever owns `lib/core/hedera.ts` (Sacha per PLAN.md).
