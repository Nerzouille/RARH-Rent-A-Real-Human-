# Story 4.2: Simulate Deposit Flow (Demo Robustness)

Status: done

## Story

As a demo client,
I want to simulate an HBAR deposit in one click,
So that I can instantly fund my account for a demo task without using an external faucet.

## Acceptance Criteria

1. **Given** I am a verified user on the tasks page (or a dedicated dashboard page)
   **When** I click "Simulate 50 HBAR Deposit"
   **Then** the server-side platform account executes a real Hedera Transfer of 50 HBAR
   **And** my `hbar_balance` in the database is updated atomically with the Hedera TX result
   **And** my dashboard balance reflects the new amount immediately

2. **Given** the Hedera transaction succeeds
   **When** the deposit completes
   **Then** the UI shows the transaction ID and a clickable Hashscan link
   **And** a success toast/notification confirms the deposit amount

3. **Given** the Hedera transaction fails (network issue, insufficient platform funds)
   **When** the deposit attempt completes
   **Then** the database balance is NOT updated (atomicity)
   **And** a clear error message is shown to the user

4. **Given** I have already deposited HBAR
   **When** I click "Simulate 50 HBAR Deposit" again
   **Then** the balance accumulates (e.g., 50 + 50 = 100 HBAR)

## Tasks / Subtasks

- [x] Task 1: Harden `simulateDeposit` tRPC mutation for atomicity (AC: #1, #3)
  - [x] 1.1 In payment router `simulateDeposit`, ensure DB update only happens AFTER Hedera TX receipt confirms SUCCESS
  - [x] 1.2 Wrap the Hedera TX + DB update in proper error handling: if Hedera TX fails, do NOT update DB balance
  - [x] 1.3 Handle case where user has no `hedera_account_id` — for demo, use the platform account ID as the recipient (self-transfer with memo)
  - [x] 1.4 Return `txId`, `hashscanLink`, and `newBalance` in the response

- [x] Task 2: Create "Simulate Deposit" UI component (AC: #1, #2, #4)
  - [x] 2.1 Create `src/components/simulate-deposit-button.tsx` — a client component with a "Simulate 50 HBAR Deposit" button
  - [x] 2.2 Use `trpc.payment.simulateDeposit.useMutation()` to call the backend
  - [x] 2.3 Show loading state during the Hedera TX (3-5s expected)
  - [x] 2.4 On success: display the new balance + Hashscan link (use `sonner` toast)
  - [x] 2.5 On error: display a clear error toast
  - [x] 2.6 Invalidate `payment.getBalance` query on success to refresh balance everywhere

- [x] Task 3: Add balance display + deposit button to tasks page (AC: #1, #4)
  - [x] 3.1 Add a balance display section to `src/app/tasks/page.tsx` showing current `hbar_balance`
  - [x] 3.2 Include the `SimulateDepositButton` component
  - [x] 3.3 Use `trpc.payment.getBalance.useQuery()` for the balance display

- [x] Task 4: Handle the "no hedera_account_id" edge case for demo (AC: #1)
  - [x] 4.1 In the `simulateDeposit` mutation, if user has no `hedera_account_id`, perform a self-transfer on the platform account (memo: `simulate-deposit:demo:50HBAR`) and update the DB balance — this is the demo path since users don't have real Hedera accounts
  - [x] 4.2 Update `src/lib/core/hedera.ts` `simulateDeposit()` to accept an optional recipientAccountId (if null, do a self-transfer with memo)

### Review Findings

- [x] [Review][Patch] Race condition TOCTOU on balance update — use SQL increment instead of read-then-write [src/server/routers/payment.ts]
- [x] [Review][Patch] Toast hardcodes "50 HBAR" — extracted DEPOSIT_AMOUNT constant [src/components/simulate-deposit-button.tsx]
- [x] [Review][Patch] Hashscan URL formatting — split on @ and replace dot in timestamp part only [src/lib/core/hedera.ts]
- [x] [Review][Defer] DB update failure after successful Hedera TX has no compensation — deferred, needs design decision
- [x] [Review][Defer] releasePayment has no authorization check — deferred, scope story 4.4
- [x] [Review][Defer] lockEscrow does not deduct from client balance — deferred, scope story 4.3
- [x] [Review][Defer] lockEscrow throws raw Error instead of TRPCError — deferred, pre-existing
- [x] [Review][Defer] Same TOCTOU race in releasePayment — deferred, scope story 4.4

## Dev Notes

### Existing Code Analysis

The `simulateDeposit` flow is **partially implemented** from story 4.1 scaffolding:

- **`src/lib/core/hedera.ts`** has `simulateDeposit(recipientAccountId, amountHbar)` that does a real Hedera transfer from platform account to recipient
- **`src/server/routers/payment.ts`** has `simulateDeposit` mutation that calls the hedera function + updates DB balance
- **Story 4.1 review noted**: "simulateDeposit DB update not atomic with Hedera TX — deferred, scope story 4.2"

### Key Issues to Fix

1. **Atomicity gap**: Current code updates DB balance even if Hedera TX fails halfway. The DB update must only happen after receipt confirms SUCCESS.
2. **Missing `hedera_account_id`**: Most demo users won't have a real Hedera account ID. The current code throws if `user.hedera_account_id` is null. For demo, we need a fallback: do a self-transfer on the platform account and just update the DB balance.
3. **No UI exists**: There's no component or page section to trigger the deposit.
4. **Error handling**: Current mutation uses `throw new Error()` instead of `TRPCError`.

### Architecture Compliance

- **File locations**: 
  - Backend: `src/lib/core/hedera.ts` and `src/server/routers/payment.ts` (already exist)
  - UI component: `src/components/simulate-deposit-button.tsx` (new — follows `components/` convention)
  - Page integration: `src/app/tasks/page.tsx` (existing)
- **Styling**: Tailwind + shadcn/ui components only (Button from shadcn)
- **Error handling**: Use `TRPCError` in router, `Error` in lib/core
- **Toast**: Use `sonner` for transaction feedback (per architecture doc)

### Technical Details

- **Hedera SDK**: `@hashgraph/sdk` v2.81.0, `TransferTransaction`, `Hbar`
- **Hashscan URL**: `hashscanUrl(txId)` already in `src/lib/core/hedera.ts`
- **tRPC client**: `trpc` from `@/lib/trpc/client`
- **Amount**: Fixed 50 HBAR for demo simplicity (input schema already has `.default(50)`)
- **Self-transfer pattern**: `TransferTransaction.addHbarTransfer(platformId, new Hbar(0))` with memo — generates a valid TX ID on Hedera Testnet without moving funds

### Previous Story Intelligence (4.1)

- Lazy singleton pattern for Hedera client — reuse `getClient()`, don't create new instances
- `validateEnv()` already handles missing env vars with clear errors
- `getOperatorAccountId()` exists to get platform account ID without exposing keys
- Tests exist in `src/tests/hedera.test.ts` — extend if adding new hedera.ts functions

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Epic 4 mapping]
- [Source: _bmad-output/implementation-artifacts/stories/4-1-hedera-testnet-account-and-server-side-security.md#Review Findings]
- [Source: docs/tracks/hedera-agentic-payments.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Refactored `simulateDeposit()` in `src/lib/core/hedera.ts`: changed signature to `(amountHbar, recipientAccountId?)`, supports self-transfer when no recipient (demo mode), validates receipt status
- Hardened `simulateDeposit` tRPC mutation: DB update only after Hedera TX receipt SUCCESS, proper `TRPCError` error handling, handles missing `hedera_account_id` gracefully
- Created `SimulateDepositButton` component with loading state, success toast (sonner) with Hashscan link, error toast, and balance invalidation
- Updated tasks page with balance display card and deposit button
- All 80 existing tests pass, no regressions

### File List

- `src/lib/core/hedera.ts` — refactored `simulateDeposit()` signature and added demo self-transfer support
- `src/server/routers/payment.ts` — hardened `simulateDeposit` mutation with atomicity and TRPCError
- `src/components/simulate-deposit-button.tsx` — new: deposit button with loading/success/error states
- `src/app/tasks/page.tsx` — added balance display and SimulateDepositButton
