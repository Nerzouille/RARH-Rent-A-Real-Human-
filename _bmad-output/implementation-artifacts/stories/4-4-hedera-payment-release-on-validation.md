# Story 4.4: Hedera Payment Release on Validation

Status: done

## Story

As a system,
I want to automatically release HBAR from the escrow to the worker's account upon validation,
So that I can deliver the "Aha Moment" of frictionless payment.

## Acceptance Criteria

1. **Given** a task status is changed to `validated` by the client
   **When** the validation API triggers the payment flow
   **Then** a Hedera Transfer transaction moves the budget from the platform escrow to the worker's account
   **And** the task status is only finalized in the database after the Hedera transaction succeeds
   **And** the `payment_tx_id` is stored with the task.

2. **Given** the worker does not have a `hedera_account_id`
   **When** the validation triggers payment
   **Then** the system performs a self-transfer on the platform account with a `release:<taskId>` memo (same MVP pattern as escrow)
   **And** the worker's `hbar_balance` is credited in the DB.

3. **Given** the Hedera payment TX fails
   **When** the validation flow detects the failure
   **Then** the task status remains `completed` (NOT `validated`)
   **And** no DB balance changes occur
   **And** a clear error message is returned.

4. **Given** a task is successfully validated with payment
   **When** the response is returned
   **Then** it includes the `payment_tx_id` and a Hashscan link.

## Tasks / Subtasks

- [x] Task 1: Integrate payment release into `task.validate` tRPC mutation (AC: #1, #2, #3, #4)
  - [x] 1.1 In `src/server/routers/task.ts` `validate` mutation: after all permission checks, fetch the worker user by `task.worker_nullifier`
  - [x] 1.2 Call `releasePayment(workerAccountId, budget_hbar, taskId)` BEFORE updating task status — if worker has no `hedera_account_id`, call a self-transfer variant with release memo
  - [x] 1.3 Wrap DB updates in `db.transaction()`: update task status to `validated` + set `payment_tx_id`, increment worker `tasks_completed` with SQL, credit worker `hbar_balance` with SQL increment
  - [x] 1.4 Return `payment_tx_id` and `hashscanLink` in the response
  - [x] 1.5 If Hedera TX fails: throw `TRPCError` with `INTERNAL_SERVER_ERROR`, do NOT change task status or balances

- [x] Task 2: Update `releasePayment` in `src/lib/core/hedera.ts` (AC: #2)
  - [x] 2.1 Handle case where `workerAccountId` is null/undefined: do self-transfer with memo `release:<taskId>:<budget>HBAR` (same pattern as `lockEscrow`)
  - [x] 2.2 Use `getOperatorAccountId()` instead of raw `process.env.HEDERA_ACCOUNT_ID!`

- [x] Task 3: Remove/simplify standalone `payment.releasePayment` mutation (AC: cleanup)
  - [x] 3.1 Remove the `releasePayment` mutation from `src/server/routers/payment.ts` — now integrated into `task.validate`

### Review Findings

- [x] [Review][Patch] TOCTOU race + double-payment on retry — added `payment_tx_id IS NULL` guard before Hedera call + optimistic lock `WHERE status = 'completed'` on DB update [src/server/routers/task.ts]
- [x] [Review][Defer] Hedera TX succeeds but DB fails = orphaned payment with no compensation TX — deferred, needs saga/idempotency design (post-hackathon)
- [x] [Review][Defer] No validation on budget_hbar <= 0 at validate time — deferred, CreateTaskSchema already enforces positive budget at creation
- [x] [Review][Defer] Self-transfer Hbar(0) when worker has no hedera_account_id — deferred, conscious MVP design; real escrow is post-hackathon

## Dev Notes

### Existing Code — Key Locations

- `src/server/routers/task.ts:217` — `validate` mutation has `// TODO (story 4.4): trigger Hedera payment release here`
- `src/server/routers/payment.ts:48-80` — standalone `releasePayment` mutation (to be removed, logic moves into task.validate)
- `src/lib/core/hedera.ts:91-112` — `releasePayment()` function (needs minor update for null workerAccountId)

### Patterns from Story 4.3 (MUST follow)

- **Atomicity**: Hedera TX first, DB updates only after receipt confirms SUCCESS
- **TOCTOU prevention**: Use SQL `SET col = col + X` / `col - X` instead of read-then-write
- **DB transaction**: Wrap all related DB writes in `db.transaction()`
- **Error handling**: `TRPCError` in routers, raw `Error` in `lib/core/`
- **Hashscan links**: Use `hashscanUrl(txId)` from `@/lib/core/hedera`

### Current Bugs in `payment.releasePayment` (to fix during integration)

1. Uses `throw new Error()` instead of `TRPCError` — fix when moving to task.validate
2. TOCTOU race: `(worker.tasks_completed ?? 0) + 1` — use SQL `tasks_completed + 1`
3. TOCTOU race: `(worker.hbar_balance ?? 0) + task.budget_hbar` — use SQL `hbar_balance + budget`
4. No `db.transaction()` wrapping — task update and worker update are separate
5. Checks `task.status !== "validated"` but at call time status is still `completed` — irrelevant once integrated into validate

### MVP Escrow Model Reminder

Funds stay in the platform account. `releasePayment` does a real HBAR transfer if worker has `hedera_account_id`, otherwise a self-transfer with memo for audit trail. The worker's `hbar_balance` in DB is always credited regardless.

### Project Structure Notes

- All changes in `src/` directory (Next.js App Router structure)
- Import paths use `@/` alias (e.g., `@/lib/core/hedera`)
- No new files needed — only modifications to existing files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4]
- [Source: _bmad-output/implementation-artifacts/stories/4-3-hedera-escrow-lock-on-task-creation.md]
- [Source: src/server/routers/task.ts:217 — TODO comment]
- [Source: src/server/routers/payment.ts:48-80 — standalone releasePayment to remove]
- [Source: src/lib/core/hedera.ts:91-112 — releasePayment function]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation.

### Completion Notes List

- Updated `releasePayment()` in `src/lib/core/hedera.ts`: accepts nullable `workerAccountId`, does self-transfer with `release:` memo when worker has no Hedera account, uses `getOperatorAccountId()` instead of raw env var
- Rewrote `task.validate` mutation in `src/server/routers/task.ts`: fetches worker, executes Hedera payment TX before any DB changes, wraps task status update + worker balance/reputation credit in `db.transaction()`, returns `payment_tx_id` + `hashscanLink`
- Removed standalone `payment.releasePayment` mutation from `src/server/routers/payment.ts` (now integrated into task.validate)
- Cleaned up unused `tasks` import from payment router

### File List

- `src/lib/core/hedera.ts` — updated `releasePayment()` to handle nullable workerAccountId with self-transfer fallback
- `src/server/routers/task.ts` — integrated Hedera payment release into `validate` mutation with atomicity
- `src/server/routers/payment.ts` — removed obsolete `releasePayment` mutation, cleaned imports
