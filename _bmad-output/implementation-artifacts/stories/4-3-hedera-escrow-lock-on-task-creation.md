# Story 4.3: Hedera Escrow Lock on Task Creation

Status: done

## Story

As a system,
I want to lock HBAR in a platform escrow account during task creation,
So that I can guarantee payment to the worker upon completion.

## Acceptance Criteria

1. **Given** a client is creating a task with a specific HBAR budget
   **When** the "Create Task" API is called
   **Then** a Hedera Transfer transaction moves the budget from the client's balance to the platform escrow account
   **And** the transaction `receipt` is obtained before the task is confirmed as `open` in the database
   **And** the `escrow_tx_id` is stored with the task.

2. **Given** the client's `hbar_balance` is less than the task `budget_hbar`
   **When** the "Create Task" API is called
   **Then** the system rejects the request with a clear "Insufficient balance" error
   **And** no Hedera TX is submitted and no task is inserted.

3. **Given** the Hedera escrow transaction fails (network issue, insufficient platform funds)
   **When** the task creation flow detects the failure
   **Then** the database balance is NOT deducted (atomicity)
   **And** no task row is created in the database
   **And** a clear error message is shown to the user.

4. **Given** a task is successfully created with escrow
   **When** the response is returned to the client
   **Then** it includes the `escrow_tx_id` and a Hashscan link for verification.

## Tasks / Subtasks

- [x] Task 1: Harden `lockEscrow` in `src/lib/core/hedera.ts` (AC: #1, #3)
  - [x] 1.1 Update `lockEscrow` to accept `clientNullifier` param (for memo tracing: `escrow:<taskId>:<budget>HBAR:client:<nullifier-prefix>`)
  - [x] 1.2 Ensure `lockEscrow` validates receipt status is SUCCESS before returning (already done, verified)

- [x] Task 2: Integrate escrow into `task.create` tRPC mutation (AC: #1, #2, #3, #4)
  - [x] 2.1 In `src/server/routers/task.ts` `create` mutation: before DB insert, fetch user and validate `hbar_balance >= budget_hbar`
  - [x] 2.2 Call `lockEscrow(budget_hbar, taskId)` BEFORE the DB insert — generate UUID upfront with `crypto.randomUUID()`, pass to `lockEscrow` and DB insert
  - [x] 2.3 After successful Hedera TX, deduct client's `hbar_balance` using SQL decrement (`hbar_balance - budget_hbar`) to avoid TOCTOU race
  - [x] 2.4 Insert task with `escrow_tx_id` set from the Hedera TX response
  - [x] 2.5 Return `escrow_tx_id` and `hashscanLink` in the response alongside the task
  - [x] 2.6 If Hedera TX fails: throw `TRPCError` with `INTERNAL_SERVER_ERROR`, do NOT insert task or deduct balance
  - [x] 2.7 Use `TRPCError` for all error paths (insufficient balance = `BAD_REQUEST`, hedera failure = `INTERNAL_SERVER_ERROR`)

- [x] Task 3: Remove standalone `lockEscrow` from payment router (AC: cleanup)
  - [x] 3.1 Removed `payment.lockEscrow` mutation — now obsolete since escrow is integrated into `task.create`.

### Review Findings

- [x] [Review][Patch] TOCTOU race on balance check — added `WHERE hbar_balance >= budget_hbar` with `gte()` guard [src/server/routers/task.ts]
- [x] [Review][Patch] Balance deduct + task insert not wrapped in a DB transaction — wrapped in `db.transaction()` [src/server/routers/task.ts]
- [x] [Review][Patch] No rowsAffected check on balance UPDATE — check `updated.length === 0` and throw [src/server/routers/task.ts]
- [x] [Review][Defer] Hedera TX succeeds but DB fails = orphaned escrow with no compensation TX — deferred, needs design decision (post-hackathon)
- [x] [Review][Defer] Nullifier prefix in Hedera memo leaks partial identifier on-chain — deferred, privacy tradeoff vs audit trail
- [x] [Review][Defer] Memo can exceed 100 bytes with very large budget_hbar — deferred, edge case unlikely in demo
- [x] [Review][Defer] clientNullifier optional fallback "unknown" — deferred, all current callers pass it
- [x] [Review][Defer] Error message may leak Hedera SDK internals — deferred, acceptable for hackathon
- [x] [Review][Defer] No idempotency guard on retry — deferred, post-hackathon scope
- [x] [Review][Defer] No max on budget_hbar in CreateTaskSchema — deferred, demo scope

## Dev Notes

### Existing Code Analysis

The `task.create` mutation in `src/server/routers/task.ts:53` has a `TODO (story 4.3)` comment marking exactly where the escrow logic should go. Currently it just inserts the task without any Hedera interaction.

The `lockEscrow` function in `src/lib/core/hedera.ts:66` already exists and works — it does a self-transfer with memo on the platform account (MVP escrow model). It validates receipt status before returning.

The `payment.lockEscrow` mutation in `src/server/routers/payment.ts:49` is a standalone endpoint that was scaffolded but never wired into the task creation flow. Per the deferred review findings from story 4.2: "lockEscrow does not deduct from client balance — deferred, scope story 4.3".

### Key Patterns from Story 4.2

- **Atomicity**: Hedera TX executes FIRST, DB updates only after receipt confirms SUCCESS
- **TOCTOU prevention**: Use SQL `SET hbar_balance = hbar_balance - X` instead of read-then-write
- **Error handling**: Use `TRPCError` in routers, raw `Error` in `lib/core/`
- **Hashscan links**: Use `hashscanUrl(txId)` from `src/lib/core/hedera.ts`

### Task ID Generation

The current `tasks` table uses `$defaultFn(() => crypto.randomUUID())` for ID generation. For escrow, we need the task ID BEFORE insert (for the Hedera memo). Generate it explicitly: `const taskId = crypto.randomUUID()` and pass it to both `lockEscrow` and the DB insert.

### Architecture Compliance

- **File locations**:
  - `src/lib/core/hedera.ts` — minor update to `lockEscrow` signature
  - `src/server/routers/task.ts` — main changes (escrow integration in `create`)
  - `src/server/routers/payment.ts` — remove `lockEscrow` mutation
- **Error handling**: `TRPCError` in routers with human-readable messages
- **Imports**: `lockEscrow`, `hashscanUrl` from `@/lib/core/hedera`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Epic 4 mapping]
- [Source: _bmad-output/implementation-artifacts/stories/4-2-simulate-deposit-flow-demo-robustness.md#Review Findings]
- [Source: src/server/routers/task.ts:56 — TODO comment]
- [Source: src/server/routers/payment.ts:49-65 — standalone lockEscrow to remove]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Updated `lockEscrow()` in `src/lib/core/hedera.ts`: added optional `clientNullifier` param for memo tracing, uses `getOperatorAccountId()` instead of raw env var
- Rewrote `task.create` mutation in `src/server/routers/task.ts`: balance validation, Hedera escrow TX before DB insert, SQL decrement for TOCTOU safety, pre-generated UUID for task ID, returns escrow_tx_id + hashscanLink
- Removed standalone `payment.lockEscrow` mutation from `src/server/routers/payment.ts` (now integrated into task.create)
- All 80 existing tests pass, no regressions

### File List

- `src/lib/core/hedera.ts` — updated `lockEscrow()` signature with optional `clientNullifier` param
- `src/server/routers/task.ts` — integrated Hedera escrow lock into `create` mutation with balance check and atomicity
- `src/server/routers/payment.ts` — removed obsolete `lockEscrow` mutation
