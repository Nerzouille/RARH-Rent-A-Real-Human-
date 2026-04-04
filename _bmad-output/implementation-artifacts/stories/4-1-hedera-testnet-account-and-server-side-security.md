# Story 4.1: Hedera Testnet Account & Server-Side Security

Status: done

## Story

As a developer,
I want to configure the Hedera Testnet operator account server-side,
So that I can sign escrow and payment transactions securely without exposing keys to the client.

## Acceptance Criteria

1. **Given** the environment variables `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY` are configured  
   **When** the server initializes the Hedera client  
   **Then** it connects to Hedera Testnet using `Client.forTestnet()` with the operator set

2. **Given** a Hedera transaction is needed (escrow, payment, deposit)  
   **When** the transaction is signed and executed  
   **Then** signing occurs exclusively on the server (no private key exposure to the client)

3. **Given** the environment variables are missing or invalid  
   **When** a Hedera operation is attempted  
   **Then** the system throws a clear error message instead of silently failing

4. **Given** a successful Hedera transaction  
   **When** a transaction ID is returned  
   **Then** a valid Hashscan testnet URL can be generated from it

## Tasks / Subtasks

- [x] Task 1: Validate and harden `src/lib/core/hedera.ts` (AC: #1, #2, #3)
  - [x] 1.1 Add env var validation at module load (throw if `HEDERA_ACCOUNT_ID` or `HEDERA_PRIVATE_KEY` are missing when first called)
  - [x] 1.2 Add `getOperatorAccountId()` helper to expose the platform account ID without exposing keys
  - [x] 1.3 Add `getAccountBalance()` function to query the platform account's HBAR balance on Hedera
  - [x] 1.4 Ensure `getClient()` uses lazy singleton pattern (avoid creating multiple Client instances)
- [x] Task 2: Add `getBalance` procedure to payment router (AC: #4)
  - [x] 2.1 Add a `getPlatformBalance` tRPC query that calls `getAccountBalance()` for admin/demo use
- [x] Task 3: Add unit tests for new functions (AC: #3, #4)
  - [x] 3.1 Test env var validation throws when vars are missing
  - [x] 3.2 Test `getOperatorAccountId()` returns the configured account ID
  - [x] 3.3 Test `hashscanUrl()` formatting (already exists - verify coverage)
- [x] Task 4: Verify `.env.example` has all required Hedera vars documented
  - [x] 4.1 Confirm `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY` are present with comments

### Review Findings

- [x] [Review][Patch] Redundant `validateEnv()` call in `getAccountBalance` [src/lib/core/hedera.ts]
- [x] [Review][Patch] `getPlatformBalance` missing admin role check [src/server/routers/payment.ts]
- [x] [Review][Patch] Tests don't restore `process.env` with `afterAll` [src/tests/hedera.test.ts]
- [x] [Review][Patch] Unhandled error states in `getAccountBalance` [src/lib/core/hedera.ts]
- [x] [Review][Patch] Superficial environment variable validation in `validateEnv` [src/lib/core/hedera.ts]
- [x] [Review][Defer] `PrivateKey.fromStringECDSA` no fallback for wrong key format — deferred, pre-existing
- [x] [Review][Defer] `releasePayment` no auth check + not idempotent — deferred, scope story 4.4
- [x] [Review][Defer] `lockEscrow` not idempotent — deferred, scope story 4.3
- [x] [Review][Defer] `simulateDeposit` DB update not atomic with Hedera TX — deferred, scope story 4.2

## Dev Notes

### Existing Code Analysis

Most of story 4.1 is **already implemented** from the scaffolding done during story 3.1:

- **`src/lib/core/hedera.ts`** already contains:
  - `getClient()` initializing `Client.forTestnet()` with operator from env vars
  - `lockEscrow()`, `releasePayment()`, `simulateDeposit()` functions
  - `hashscanUrl()` utility for Hashscan testnet links
- **`src/server/routers/payment.ts`** already has full tRPC router with `simulateDeposit`, `lockEscrow`, `releasePayment`, `getBalance` procedures
- **`.env.example`** already lists `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY`
- **`@hashgraph/sdk` v2.81.0** is already in `package.json`
- **`src/tests/hedera.test.ts`** has basic `hashscanUrl` tests

### What Remains (Delta)

The primary gaps are **hardening and robustness**:

1. **No env var validation** - `getClient()` uses `!` non-null assertions; will throw cryptic errors if vars are missing
2. **No singleton** - each call to `getClient()` creates a new Hedera Client instance
3. **No platform balance query** - can't verify the operator account has HBAR before attempting transactions
4. **No `getOperatorAccountId()` helper** - other modules that need the platform account ID must read env vars directly

### Architecture Compliance

- **File location**: `src/lib/core/hedera.ts` (correct per architecture: `/lib/core/` for SDK wrappers)
- **Server-only**: All Hedera operations are in server-side code (tRPC routers + lib/core), never imported by client components
- **Env vars**: `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY` are server-only (no `NEXT_PUBLIC_` prefix)
- **Error handling**: Use `TRPCError` in routers, plain `Error` in lib/core (routers wrap them)

### Key Technical Details

- **Hedera SDK**: `@hashgraph/sdk` v2.81.0 - uses `PrivateKey.fromStringECDSA()` for ECDSA keys
- **Testnet only**: `Client.forTestnet()` - never mainnet
- **Transaction memos**: Used as pseudo-escrow tracking (`escrow:taskId:budgetHbar`)
- **Hashscan URL format**: `https://hashscan.io/testnet/transaction/{txId}` where `@` in txId is replaced with `-`

### References

- [Source: docs/tracks/hedera-agentic-payments.md#Hedera SDK Direct Usage]
- [Source: _bmad-output/planning-artifacts/architecture.md#Epic 4 mapping]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Hardened `getClient()` with lazy singleton pattern and env var validation
- Added `validateEnv()` that throws descriptive errors when `HEDERA_ACCOUNT_ID` or `HEDERA_PRIVATE_KEY` are missing
- Added `getOperatorAccountId()` to expose platform account ID without leaking private keys
- Added `getAccountBalance()` using `AccountBalanceQuery` to query HBAR balance on Hedera Testnet
- Added `getPlatformBalance` tRPC query to payment router for admin/demo use
- Added 3 new unit tests for env validation and `getOperatorAccountId()`
- All 58 tests pass, no regressions

### File List

- `src/lib/core/hedera.ts` — hardened with singleton, env validation, new exports
- `src/server/routers/payment.ts` — added `getPlatformBalance` query
- `src/tests/hedera.test.ts` — added env validation and `getOperatorAccountId` tests
