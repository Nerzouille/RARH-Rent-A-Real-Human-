# Story 3.4: Task Claim Flow (Nullifier Check)

Status: review

## Story

As a verified worker,
I want to claim an available task,
So that I can secure the work exclusively for myself.

## Acceptance Criteria

1. **Given** I am a verified worker on `/tasks/[id]` and the task is `open`
   **When** I view the page
   **Then** I see a prominent "Claim This Task" button (indigo, full width)
   **And** below the description, above the Hedera escrow section.

2. **Given** I click "Claim This Task"
   **When** the mutation is in flight
   **Then** the button shows "Claiming…" and is disabled.

3. **Given** the claim mutation succeeds
   **When** the server returns the updated task
   **Then** the page auto-refreshes to the claimed state (same URL, invalidate query)
   **And** I see "✅ You've claimed this task."

4. **Given** I am a verified worker viewing a task I already claimed (`task.worker_nullifier === session.nullifier`)
   **When** the task status is `claimed`
   **Then** I see "✅ You've claimed this task. Complete the work, then come back." (no claim button)
   **And** no "Mark as Complete" button — that is story 3.5 scope.

5. **Given** I am a verified worker viewing a task claimed by someone else
   **When** `task.status !== "open"` and `task.worker_nullifier !== session.nullifier`
   **Then** I see "This task has been claimed. Browse other available tasks →" (links to `/tasks`)
   **And** no claim button is shown.

6. **Given** I am not logged in (no session) viewing an open task
   **When** the page loads
   **Then** I see "Verify your identity to claim tasks." with a link to `/register`
   **And** no claim button is shown.

7. **Given** the claim fails server-side (e.g. race condition, task already taken)
   **When** the mutation returns an error
   **Then** I see an inline error message below the button: the error message from the server.

8. **Given** I am a client (not a worker) viewing an open task
   **When** the page loads
   **Then** no claim button is shown (clients post tasks, workers claim them).

## Tasks / Subtasks

- [x] Task 1 — Extend `/tasks/[id]/page.tsx` with session + claim (AC: #1–#8)
  - [x] 1.1 Add `trpc.auth.me.useQuery()` for session (already imported pattern from story 3.3 — same `trpc` client import).
  - [x] 1.2 Add `trpc.task.claim.useMutation()` with `onSuccess` → invalidate `utils.task.get` query, and `onError` → set inline error state.
  - [x] 1.3 Add `const utils = trpc.useUtils()` for query invalidation after successful claim.
  - [x] 1.4 Add `const [claimError, setClaimError] = useState<string | null>(null)`.
  - [x] 1.5 Add the claim action section JSX **below the description block, above the Hedera escrow section**.

- [x] Task 2 — Implement claim action section JSX (AC: #1–#8)
  - [x] 2.1 Render the action section only when `task` is loaded (already inside the existing task render).
  - [x] 2.2 **Not verified / no session** (`!session`): render `<p>Verify your identity to claim tasks. <Link href="/register">Verify with World ID →</Link></p>` (gray text, link in indigo).
  - [x] 2.3 **Client role** (`session.role === "client"`): render nothing in this section — clients see the full task info but no claim UI.
  - [x] 2.4 **Worker + task open** (`session.role === "worker"` AND `task.status === "open"`): render the full-width "Claim This Task" button (indigo).
  - [x] 2.5 **Worker + claimed by self** (`session.role === "worker"` AND `task.status !== "open"` AND `task.worker_nullifier === session.nullifier`): render `"✅ You've claimed this task."` (green text, no button — story 3.5 adds the next action).
  - [x] 2.6 **Worker + claimed by other** (`session.role === "worker"` AND `task.status !== "open"` AND `task.worker_nullifier !== session.nullifier`): render `"This task has been claimed."` + `<Link href="/tasks">Browse other available tasks →</Link>`.
  - [x] 2.7 Render `claimError` inline below the button when non-null: `<p className="text-sm text-red-600 mt-2">{claimError}</p>`.
  - [x] 2.8 Clear `claimError` on new mutation start (`onMutate` or in the button's `onClick`).

- [x] Task 3 — Tests (AC: schema + claim logic)
  - [x] 3.1 Add test block in `src/tests/task-schema.test.ts` — verify `z.object({ taskId: z.string() })` accepts a valid UUID and rejects empty string (unit test the claim input schema shape — inline schema, no import needed).
  - [x] 3.2 Run `pnpm test` and confirm 105+ passing (same as story 3.3 baseline, 5 pre-existing failures from 1.3 are acceptable).

## Dev Notes

### What already exists — DO NOT recreate

| File / Symbol | Status | Notes |
|---|---|---|
| `trpc.task.claim` mutation | ✅ Complete | `protectedProcedure`, input `{ taskId: string }`, validates `status === "open"`, sets `worker_nullifier = session.nullifier`, status → `claimed` |
| `src/app/tasks/[id]/page.tsx` | ✅ Exists — MODIFY | `"use client"`, uses `use(params)` + `trpc.task.get.useQuery({ id })`, already has status badges, description, escrow section |
| `trpc.auth.me` | ✅ Complete | Returns `{ nullifier, role, userId }` or null if no session |
| `TaskSchema` in `@/lib/schemas` | ✅ Complete | Has `worker_nullifier: string | null`, `status`, `client_type` |
| `statusColors` map | ✅ In `tasks/[id]/page.tsx` | Already defined inline — do NOT move it |
| `src/components/tasks/TaskCard.tsx` | ✅ Complete (story 3.3) | Used in list only — do NOT import in detail page |

### `trpc.task.claim` mutation signature

```typescript
// Input
{ taskId: string }

// Server behaviour (task.ts):
// - throws BAD_REQUEST if task.status !== "open" (task not available)
// - sets status = "claimed", worker_nullifier = ctx.session.nullifier, updated_at = new Date()
// - returns the updated task row

// tRPC error codes:
// BAD_REQUEST: "Task is not available for claiming"
```

### Claim action implementation pattern

```tsx
// Add to top of TaskDetailPage component:
const utils = trpc.useUtils();
const { data: session } = trpc.auth.me.useQuery();
const [claimError, setClaimError] = useState<string | null>(null);

const { mutate: claimTask, isPending: isClaiming } = trpc.task.claim.useMutation({
  onSuccess: () => {
    utils.task.get.invalidate({ id });  // triggers re-fetch → page shows claimed state
  },
  onError: (err) => {
    setClaimError(err.message);
  },
});

// Claim action section JSX (place below description, above escrow section):
<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-4">
  {/* conditional content per AC #2–#8 */}
</div>
```

### Button styling (from UX spec Screen 2.2)

```tsx
// Idle state — full width, indigo
<button
  onClick={() => { setClaimError(null); claimTask({ taskId: task.id }); }}
  disabled={isClaiming}
  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {isClaiming ? "Claiming…" : "Claim This Task"}
</button>
```

### Complete claim action section — all states

```tsx
{/* Claim action section */}
<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-4 flex flex-col gap-3">
  {!session ? (
    <p className="text-sm text-zinc-500">
      Verify your identity to claim tasks.{" "}
      <Link href="/register" className="text-indigo-600 hover:underline">
        Verify with World ID →
      </Link>
    </p>
  ) : session.role === "worker" && task.status === "open" ? (
    <>
      <p className="text-xs text-zinc-500">
        Payment is held in escrow until your work is validated.
      </p>
      <button
        onClick={() => { setClaimError(null); claimTask({ taskId: task.id }); }}
        disabled={isClaiming}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isClaiming ? "Claiming…" : "Claim This Task"}
      </button>
      {claimError && <p className="text-sm text-red-600">{claimError}</p>}
    </>
  ) : session.role === "worker" && task.worker_nullifier === session.nullifier ? (
    <p className="text-sm font-medium text-emerald-600">
      ✅ You've claimed this task. Complete the work, then come back.
    </p>
  ) : session.role === "worker" ? (
    <p className="text-sm text-zinc-500">
      This task has been claimed.{" "}
      <Link href="/tasks" className="text-indigo-600 hover:underline">
        Browse other available tasks →
      </Link>
    </p>
  ) : null /* client role — no claim UI */}
</div>
```

### Where to insert in existing page structure

Current `tasks/[id]/page.tsx` layout (bottom of `<main>`):
1. `← Back to tasks` link
2. Status badge
3. Title `<h1>`
4. Budget / Deadline / Client info boxes
5. Description section
6. **→ INSERT claim action section HERE (new) ←**
7. Hedera Escrow section (existing `task.escrow_tx_id && (...)` block)

### Important: tRPC utils pattern (query invalidation)

```typescript
// Correct pattern — call useUtils() at component top level
const utils = trpc.useUtils();

// In onSuccess callback:
utils.task.get.invalidate({ id });
// This triggers a re-fetch of trpc.task.get.useQuery({ id })
// → page reflects the new "claimed" status without a full reload
```

### Architecture compliance

- `src/app/tasks/[id]/page.tsx` — already `"use client"`, keep directive
- All data via tRPC — no raw fetch/REST calls (UX spec mentions `/api/tasks/[id]/claim` but the real endpoint is tRPC `task.claim`)
- No new packages needed — `useState`, `useMutation`, `useUtils` all available
- No new DB schema changes
- No new files needed (only modify `tasks/[id]/page.tsx` and `task-schema.test.ts`)

### Route discrepancy: UX spec vs implementation

The UX spec references `/worker/dashboard` — this route does NOT exist. Actual route is `/tasks`. Links to task list must use `/tasks`.

### Cross-story context

- **Story 3.3** (done) created `TaskCard` with "View Task →" link to `/tasks/[id]` — that link is the entry point to this page
- **Story 3.5** (backlog) will add "Mark as Complete" button to this same page — do NOT implement it now
- **Story 4.4** (done) `task.validate` is complete — triggers payment release from `task.payment_tx_id`
- The `task.claim` procedure is already implemented and tested server-side — only UI wiring needed here

### Testing

- Framework: Vitest (`pnpm test`)
- Add to existing `src/tests/task-schema.test.ts`
- Unit test the claim input schema shape (inline `z.object({ taskId: z.string() })`) — no DB or auth needed
- Baseline: 105 passing, 5 pre-existing failures from story 1.3 (SESSION_SECRET / onConflictDoNothing mock) — not yours to fix

### References

- [Source: `epics.md#Story 3.4`] — FR12, FR13
- [Source: `ux-design.md#Screen 2.2`] — Claim button anatomy + states
- [Source: `ux-design.md#Screen 2.3`] — Claimed state display
- [Source: `src/server/routers/task.ts`] — `claim` mutation implementation
- [Source: `src/app/tasks/[id]/page.tsx`] — Existing page to modify
- [Source: story 3.3 Dev Agent Record] — `trpc.useUtils()` invalidation pattern, no toast library, inline error state

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Modified `tasks/[id]/page.tsx`: added `useState` import, `trpc.auth.me.useQuery()` for session, `trpc.useUtils()` for query invalidation, `trpc.task.claim.useMutation()` with onSuccess invalidate + onError error state
- Claim action section inserted below description, above Hedera escrow: 5 conditional states (no session, worker+open, worker+claimed-by-self, worker+claimed-by-other, client=null)
- Button: full-width indigo, disabled during mutation, shows "Claiming…" spinner state
- Inline error display via `claimError` state, cleared on each new click
- `onSuccess`: invalidates `utils.task.get` → page auto-refreshes to claimed state without full reload
- Added 4 new tests to `task-schema.test.ts` for claim input schema validation: 109 passing, 5 pre-existing failures from story 1.3 (not introduced here)
- Added `import { z } from "zod"` to test file (needed for inline schema test)

### Change Log

- 2026-04-04: Story created from BMAD artifacts, codebase analysis (task.ts claim mutation, tasks/[id]/page.tsx, UX spec Flow 2).
- 2026-04-04: Implemented all tasks — tasks/[id]/page.tsx reworked with claim flow (5 states), 4 new tests. 109/123 tests pass (5 pre-existing failures from story 1.3).

### File List

- `src/app/tasks/[id]/page.tsx` — modified: added session + claim mutation + claim action section (5 states)
- `src/tests/task-schema.test.ts` — modified: added `z` import + 4 claim input schema tests
