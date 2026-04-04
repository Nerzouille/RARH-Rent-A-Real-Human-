# Story 3.5: Task Completion & Validation UI (with Delight!)

Status: done

## Story

As a worker, I want to mark a task as complete, and as a client, I want to validate it with a celebration,
so that the payment process is triggered and both parties feel rewarded.

## Acceptance Criteria

1. **Given** I am the assigned worker on `/tasks/[id]` with task status `claimed`
   **When** I view the page
   **Then** I see a prominent "Mark as Complete" button (indigo, full width) and the message "Complete the work, then tap below."
   **And** the static "then come back" message from story 3.4 is replaced by this CTA.

2. **Given** I click "Mark as Complete"
   **When** the mutation is in flight
   **Then** the button shows "Submitting…" and is disabled.

3. **Given** the markComplete mutation succeeds
   **When** the server returns the updated task
   **Then** the page auto-refreshes (query invalidated) to the `completed` state
   **And** I see a green banner: "Completion submitted! Awaiting client validation."
   **And** no "Mark as Complete" button is shown (status is now `completed`).

4. **Given** the markComplete mutation fails
   **When** the server returns an error
   **Then** I see an inline error message below the button.

5. **Given** I am the client who posted the task and task status is `claimed`
   **When** I view the page
   **Then** I see "⏳ Worker is completing the task. You'll be notified when they're done."
   **And** the page automatically polls every 5 seconds to detect when the worker marks it complete.

6. **Given** I am the client and task status is `completed`
   **When** I view the page
   **Then** I see "Worker has marked this complete. Review and validate to release payment."
   **And** I see a prominent "Validate & Release" button (indigo, full width).

7. **Given** I click "Validate & Release"
   **When** the mutation is in flight
   **Then** the button shows "Releasing payment…" and is disabled.

8. **Given** the validate mutation succeeds
   **When** the server returns `payment_tx_id` and `hashscanLink`
   **Then** a confetti animation fires on screen
   **And** the page refreshes to the `validated` state
   **And** I see "✅ Task complete. Payment released to worker." with the payment TX hashscan link.

9. **Given** the validate mutation fails
   **When** the server returns an error
   **Then** I see an inline error message below the button.

10. **Given** task status is `validated` and I am the client
    **When** I view the page
    **Then** I see "✅ Task complete. Payment released." and the Hashscan link for the payment TX.

11. **Given** I am the client and task status is `validated`
    **When** I view the page as the worker
    **Then** I see "✅ Task validated. Payment received." (final state, no action needed).

## Tasks / Subtasks

- [x] Task 1 — Install `canvas-confetti` package (AC: #8)
  - [x] 1.1 Run `pnpm add canvas-confetti` and `pnpm add -D @types/canvas-confetti`
  - [x] 1.2 Verify it appears in `package.json` dependencies

- [x] Task 2 — Add mutations and polling to `tasks/[id]/page.tsx` (AC: #1–#11)
  - [x] 2.1 Import `confetti` from `canvas-confetti` at top of file
  - [x] 2.2 Add `const [markCompleteError, setMarkCompleteError] = useState<string | null>(null)`
  - [x] 2.3 Add `const [validateError, setValidateError] = useState<string | null>(null)`
  - [x] 2.4 Add `trpc.task.markComplete.useMutation()` with `onSuccess` → invalidate query, `onError` → set error state
  - [x] 2.5 Add `trpc.task.validate.useMutation()` with `onSuccess` → fire confetti + invalidate query, `onError` → set error state
  - [x] 2.6 Add `refetchInterval` to the existing `trpc.task.get.useQuery` call so it polls every 5s when `task.status === "claimed"` (for client auto-refresh AC #5)

- [x] Task 3 — Update worker action section in JSX (AC: #1–#4, #11)
  - [x] 3.1 Replace the current `task.status === "claimed" && worker_nullifier === session.nullifier` branch (which shows static text) with the full "Mark as Complete" CTA block
  - [x] 3.2 Add `task.status === "completed" && worker_nullifier === session.nullifier` branch showing green "Completion submitted!" banner
  - [x] 3.3 Add `task.status === "validated" && worker_nullifier === session.nullifier` branch showing "✅ Task validated. Payment received."

- [x] Task 4 — Add client action section in JSX (AC: #5–#10)
  - [x] 4.1 Replace the current `null` for `session.role === "client"` with conditional client UI
  - [x] 4.2 Client + `task.status === "claimed"`: render polling/waiting state (AC #5)
  - [x] 4.3 Client + `task.status === "completed"` + `task.client_nullifier === session.nullifier`: render "Validate & Release" button (AC #6–#9)
  - [x] 4.4 Client + `task.status === "validated"`: render success state with payment TX link (AC #10)

- [x] Task 5 — Extend Hedera escrow section to show payment TX (AC: #8, #10)
  - [x] 5.1 Extend the existing `task.escrow_tx_id` block to also show `task.payment_tx_id` when non-null (with Hashscan link using the existing `hashscanUrl` helper)

- [x] Task 6 — Tests (AC: schema shape)
  - [x] 6.1 Add test block in `src/tests/task-schema.test.ts` for `task.markComplete` input schema: `z.object({ taskId: z.string() })` accepts UUID, rejects empty
  - [x] 6.2 Add test block for `task.validate` input schema: same shape, same checks
  - [x] 6.3 Run `pnpm test` and confirm 113+ passing (109 baseline from story 3.4 + 4 new)

## Dev Notes

### What already exists — DO NOT recreate

| File / Symbol | Status | Notes |
|---|---|---|
| `trpc.task.markComplete` | ✅ Complete | `protectedProcedure`, input `{ taskId: string }`, validates `worker_nullifier === session.nullifier` AND `status === "claimed"`, sets `status → "completed"` |
| `trpc.task.validate` | ✅ Complete | `protectedProcedure`, human-client only, validates `status === "completed"` + `client_nullifier === session.nullifier`, calls Hedera `releasePayment`, sets `status → "validated"`, returns `payment_tx_id` + `hashscanLink` |
| `src/app/tasks/[id]/page.tsx` | ✅ Exists — MODIFY | Already has `trpc.task.claim`, `trpc.auth.me`, `trpc.useUtils()`, claim action section with 5 states |
| `hashscanUrl()` helper | ✅ In `tasks/[id]/page.tsx` (line 12) | Already handles mock IDs by returning `""` — reuse this for payment TX display |
| `STATUS_COLORS` | ✅ From `@/lib/constants` | Maps status → Tailwind classes; `validated` = `bg-gray-100 text-gray-600` |
| `src/tests/task-schema.test.ts` | ✅ Exists — MODIFY | Add new test blocks at end of file |

### `trpc.task.markComplete` signature

```typescript
// Input
{ taskId: string }

// Server behaviour:
// - throws FORBIDDEN if task.worker_nullifier !== ctx.session.nullifier
// - throws BAD_REQUEST if task.status !== "claimed"
// - sets status = "completed", updated_at = new Date()
// - returns updated task row

// tRPC error codes:
// FORBIDDEN: "Only the assigned worker can mark this task complete"
// BAD_REQUEST: "Task must be in claimed status to mark as complete"
```

### `trpc.task.validate` signature

```typescript
// Input
{ taskId: string }

// Server behaviour:
// - throws FORBIDDEN for agent tasks (must use MCP API)
// - throws FORBIDDEN if task.client_nullifier !== ctx.session.nullifier
// - throws BAD_REQUEST if task.status !== "completed"
// - throws BAD_REQUEST if payment_tx_id already set
// - calls Hedera releasePayment(), then sets status = "validated", payment_tx_id = paymentTxId
// - credits worker balance (+budget_hbar) and tasks_completed (+1)
// - returns: { ...updatedTask, payment_tx_id, hashscanLink }

// tRPC error codes:
// FORBIDDEN: "Only the task client can validate this task"
// BAD_REQUEST: "Task must be in completed status to validate"
// BAD_REQUEST: "Payment already released for this task"
```

### Confetti implementation

```typescript
// Install: pnpm add canvas-confetti && pnpm add -D @types/canvas-confetti

import confetti from "canvas-confetti";

// Fire in onSuccess of validate mutation:
confetti({
  particleCount: 150,
  spread: 80,
  origin: { y: 0.6 },
});
```

### Mutations pattern — copy from existing claim mutation in same file

```typescript
// Add alongside existing claimTask mutation at component top level:
const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
const [validateError, setValidateError] = useState<string | null>(null);

const { mutate: markComplete, isPending: isMarkingComplete } = trpc.task.markComplete.useMutation({
  onSuccess: () => {
    utils.task.get.invalidate({ id });
  },
  onError: (err) => {
    setMarkCompleteError("Failed to submit completion. Please try again.");
  },
});

const { mutate: validateTask, isPending: isValidating } = trpc.task.validate.useMutation({
  onSuccess: () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    utils.task.get.invalidate({ id });
  },
  onError: (err) => {
    setValidateError("Failed to release payment. Please try again.");
  },
});
```

### Auto-polling for client (AC #5)

Replace the existing `trpc.task.get.useQuery({ id })` with:

```typescript
const { data: task, isLoading } = trpc.task.get.useQuery(
  { id },
  {
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "claimed" ? 5000 : false;
    },
  }
);
```

This polls every 5s while status is `claimed`, automatically stops when it transitions to `completed`.

### Worker action section — complete state machine

Replace the existing claim action section conditional. New states to handle:

```
Condition                                                         → UI
─────────────────────────────────────────────────────────────────────
!session                                                          → "Verify identity" link (unchanged from 3.4)
worker + open                                                     → "Claim This Task" button (unchanged from 3.4)
worker + claimed + worker_nullifier === session.nullifier         → "Mark as Complete" button (NEW — replaces static text)
worker + completed + worker_nullifier === session.nullifier       → Green "Completion submitted!" banner (NEW)
worker + validated + worker_nullifier === session.nullifier       → "✅ Task validated. Payment received." (NEW)
worker + any status + worker_nullifier !== session.nullifier      → "This task has been claimed." link (unchanged from 3.4)
client + claimed + client_nullifier === session.nullifier         → "⏳ Worker is completing…" (NEW)
client + completed + client_nullifier === session.nullifier       → "Validate & Release" button (NEW)
client + validated + client_nullifier === session.nullifier       → "✅ Task complete. Payment released." + link (NEW)
client + any other                                                → null (other client's task — no action)
```

### Complete JSX for the action section

```tsx
{/* Worker states */}
{!session ? (
  <p className="text-sm text-zinc-500">
    Verify your identity to claim tasks.{" "}
    <Link href="/register" className="text-indigo-600 hover:underline">
      Verify with World ID →
    </Link>
  </p>
) : session.role === "worker" && task.status === "open" ? (
  <>
    <p className="text-xs text-zinc-500">Payment is held in escrow until your work is validated.</p>
    <button
      onClick={() => { setClaimError(null); claimTask({ taskId: task.id }); }}
      disabled={isClaiming}
      className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isClaiming ? "Claiming…" : "Claim This Task"}
    </button>
    {claimError && <p className="text-sm text-red-600">{claimError}</p>}
  </>
) : session.role === "worker" && task.status === "claimed" && task.worker_nullifier === session.nullifier ? (
  <>
    <p className="text-sm text-zinc-500">Complete the work, then tap below.</p>
    <button
      onClick={() => { setMarkCompleteError(null); markComplete({ taskId: task.id }); }}
      disabled={isMarkingComplete}
      className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isMarkingComplete ? "Submitting…" : "Mark as Complete"}
    </button>
    {markCompleteError && <p className="text-sm text-red-600">{markCompleteError}</p>}
  </>
) : session.role === "worker" && task.status === "completed" && task.worker_nullifier === session.nullifier ? (
  <p className="text-sm font-medium text-emerald-600">
    ✅ Completion submitted! Awaiting client validation.
  </p>
) : session.role === "worker" && task.status === "validated" && task.worker_nullifier === session.nullifier ? (
  <p className="text-sm font-medium text-emerald-600">
    ✅ Task validated. Payment received.
  </p>
) : session.role === "worker" ? (
  <p className="text-sm text-zinc-500">
    This task has been claimed.{" "}
    <Link href="/tasks" className="text-indigo-600 hover:underline">
      Browse other available tasks →
    </Link>
  </p>
{/* Client states */}
) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "claimed" ? (
  <p className="text-sm text-zinc-500">
    ⏳ Worker is completing the task. You&apos;ll be notified when they&apos;re done.
  </p>
) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "completed" ? (
  <>
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Worker has marked this complete. Review and validate to release payment to the worker.
    </p>
    <button
      onClick={() => { setValidateError(null); validateTask({ taskId: task.id }); }}
      disabled={isValidating}
      className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isValidating ? "Releasing payment…" : "Validate & Release"}
    </button>
    {validateError && <p className="text-sm text-red-600">{validateError}</p>}
  </>
) : session.role === "client" && task.client_nullifier === session.nullifier && task.status === "validated" ? (
  <p className="text-sm font-medium text-emerald-600">
    ✅ Task complete. Payment released to worker.
  </p>
) : null}
```

### Extend Hedera TX section to show payment TX

The existing block at the bottom of the page only shows `escrow_tx_id`. Extend it to also show `payment_tx_id`:

```tsx
{(task.escrow_tx_id || task.payment_tx_id) && (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-col gap-2">
    <p className="text-xs text-zinc-500">Hedera</p>
    {task.escrow_tx_id && (
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">Escrow TX</p>
        {task.escrow_tx_id.startsWith("mock-") ? (
          <p className="text-xs text-zinc-400 font-mono">{task.escrow_tx_id} (mock)</p>
        ) : (
          <a href={hashscanUrl(task.escrow_tx_id)} target="_blank" rel="noopener noreferrer"
             className="text-xs text-indigo-600 hover:underline font-mono">
            {task.escrow_tx_id.slice(0, 20)}… ↗
          </a>
        )}
      </div>
    )}
    {task.payment_tx_id && (
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">Payment TX</p>
        {task.payment_tx_id.startsWith("mock-") ? (
          <p className="text-xs text-zinc-400 font-mono">{task.payment_tx_id} (mock)</p>
        ) : (
          <a href={hashscanUrl(task.payment_tx_id)} target="_blank" rel="noopener noreferrer"
             className="text-xs text-indigo-600 hover:underline font-mono">
            {task.payment_tx_id.slice(0, 20)}… ↗
          </a>
        )}
      </div>
    )}
  </div>
)}
```

### Architecture compliance

- `src/app/tasks/[id]/page.tsx` — already `"use client"`, keep directive (needed for confetti + useState + mutations)
- All mutations via tRPC — no raw fetch/REST
- `canvas-confetti` is a browser-only package, safe to call inside `onSuccess` callback (client component)
- No new DB schema changes needed
- No new API routes needed — `markComplete` and `validate` already exist in `taskRouter`
- `hashscanUrl()` helper already in the file — reuse for payment TX, do NOT duplicate

### Route discrepancy: UX spec vs implementation

- UX spec references `PENDING_VALIDATION` as a status — in the DB schema, this is `completed` (worker has submitted, client must validate)
- UX spec references `IN_PROGRESS` — in the DB schema this is `claimed`
- Use `completed` and `claimed` (the actual DB enum values), not the UX spec names

### Testing — new tests to add

```typescript
// ─── task.markComplete input schema — story 3.5 ──────────────────────────────
describe("task.markComplete input schema", () => {
  const markCompleteSchema = z.object({ taskId: z.string() });

  it("accepts a valid task ID string", () => {
    expect(markCompleteSchema.safeParse({ taskId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });

  it("rejects missing taskId", () => {
    expect(markCompleteSchema.safeParse({}).success).toBe(false);
  });
});

// ─── task.validate input schema — story 3.5 ──────────────────────────────────
describe("task.validate input schema", () => {
  const validateSchema = z.object({ taskId: z.string() });

  it("accepts a valid task ID string", () => {
    expect(validateSchema.safeParse({ taskId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(true);
  });

  it("rejects missing taskId", () => {
    expect(validateSchema.safeParse({}).success).toBe(false);
  });
});
```

### Cross-story context

- **Story 3.4** (done) introduced the claim action section structure in `tasks/[id]/page.tsx` with 5 conditional states — this story extends those states, especially replacing the static "then come back" worker+claimed branch
- **Story 4.4** (done) implemented `task.validate` server-side with full Hedera payment release — this story wires up the client UI to that mutation
- **Story 4.5** (done) added `hashscanUrl()` helper already imported in `hedera.ts` — but `tasks/[id]/page.tsx` already has its own local `hashscanUrl()` copy (line 12 of the file). Use the local one, do NOT import from `@/lib/core/hedera`.

### References

- [Source: `epics.md#Story 3.5`] — acceptance criteria
- [Source: `ux-design.md#Screen 2.3`] — Mark as Complete button states
- [Source: `ux-design.md#Screen 4.1 Role-Based Action Area`] — all role+state combinations
- [Source: `ux-design.md#Hedera TX Section`] — payment TX display
- [Source: `src/server/routers/task.ts:163`] — `markComplete` mutation
- [Source: `src/server/routers/task.ts:195`] — `validate` mutation
- [Source: `src/app/tasks/[id]/page.tsx`] — file to modify (full state machine)
- [Source: story 3.4 Dev Agent Record] — existing claim section pattern, useUtils invalidation, inline error state pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_No blocking issues encountered._

### Completion Notes List

- Installed `canvas-confetti@1.9.4` and `@types/canvas-confetti@1.9.0` via pnpm
- Rewrote `src/app/tasks/[id]/page.tsx` with complete 9-state role+status action section (worker: open/claimed/completed/validated/other; client: claimed/completed/validated/other)
- Added `refetchInterval` function to `trpc.task.get.useQuery` for auto-poll every 5s when status is `claimed`
- `onSuccess` of `validate` mutation fires `confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })` then invalidates query
- Hedera TX section extended to show both `escrow_tx_id` and `payment_tx_id` with Hashscan links; mock IDs handled gracefully
- Added 4 new schema tests (2 for markComplete, 2 for validate); test count: 109 → 113 passing (5 pre-existing failures from story 1.3 SESSION_SECRET — unchanged)

### File List

- `src/app/tasks/[id]/page.tsx` — modified (full state machine, confetti, polling, payment TX section)
- `src/tests/task-schema.test.ts` — modified (added markComplete + validate schema tests)
- `package.json` — modified (canvas-confetti added to dependencies, @types/canvas-confetti to devDependencies)
- `pnpm-lock.yaml` — updated by pnpm

### Change Log

### Review Findings

- [x] [Review][Decision] Implémentation de la "Bannière" — L'AC 3 demande une "bannière verte" pour la confirmation de soumission. Le code actuel utilise un simple paragraphe de texte vert (`text-emerald-600`). Décision : Transformer en vrai composant visuel (Option B).
- [x] [Review][Patch] Lacunes dans la logique de Polling [src/app/tasks/[id]/page.tsx:28]
- [x] [Review][Patch] Persistance des états d'erreur obsolètes [src/app/tasks/[id]/page.tsx]
- [x] [Review][Patch] Découplage des tests de schéma [src/tests/task-schema.test.ts]
- [x] [Review][Patch] Import bloquant de `canvas-confetti` [src/app/tasks/[id]/page.tsx]
- [x] [Review][Patch] Garde de nullifier trop faible [src/app/tasks/[id]/page.tsx:161]
- [x] [Review][Patch] Écarts de phrasé avec les AC [src/app/tasks/[id]/page.tsx:191]
- [x] [Review][Patch] Emplacement du lien Hashscan [src/app/tasks/[id]/page.tsx]
- [x] [Review][Patch] État "Open" manquant pour le client [src/app/tasks/[id]/page.tsx:215]
- [x] [Review][Patch] Masquage des erreurs serveur réelles [src/app/tasks/[id]/page.tsx]
- [x] [Review][Defer] Logique de détection "mock" [src/app/tasks/[id]/page.tsx] — deferred, pre-existing
- [x] [Review][Defer] Troncature des hashes [src/app/tasks/[id]/page.tsx] — deferred, pre-existing
- [x] [Review][Defer] Tests d'intégration du router it.todo [src/tests/task-schema.test.ts] — deferred, pre-existing
