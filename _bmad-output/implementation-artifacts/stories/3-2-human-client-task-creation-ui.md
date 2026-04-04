# Story 3.2: Human Client Task Creation UI

Status: done

## Story

As a human client,
I want to create a task via a simple form,
So that I can solicit help from verified workers and have the budget automatically locked in Hedera escrow.

## Acceptance Criteria

1. **Given** I am an unauthenticated user on the landing page
   **When** I click "I'm a Client"
   **Then** I am taken to `/client/register` where I can verify with World ID (or mock mode)
   **And** on success I am redirected to `/client/new-task`.

2. **Given** I am a verified human client on `/client/new-task`
   **When** I fill in title, description, budget (HBAR), and deadline and click "Post Task & Fund Escrow"
   **Then** `task.create` is called via tRPC
   **And** a new task record is created in the DB with `status = "open"` and `client_type = "human"`
   **And** Hedera escrow is locked (already implemented in story 4.3 — `task.create` does this automatically)
   **And** I am redirected to `/tasks/[id]` with a success toast showing the escrow TX ID.

3. **Given** I am on `/client/new-task` with insufficient balance
   **When** I submit the form
   **Then** the server returns a `BAD_REQUEST` error with the balance shortfall
   **And** the UI displays the error clearly and does NOT redirect.

4. **Given** I am on `/client/new-task` in demo/dev mode
   **When** I look at the form
   **Then** a "Simulate 50 HBAR Deposit" button is visible below the form (reusing existing `<SimulateDepositButton>`)
   **And** my current HBAR balance is displayed so I know if I have enough before submitting.

5. **Given** I am on `/client/new-task` with invalid form data
   **When** I try to submit
   **Then** client-side validation blocks submission and shows field-level error messages
   **And** the "Post Task & Fund Escrow" button is disabled while any field is invalid.

## Tasks / Subtasks

- [x] Task 1 — Add `role` prop to `RegisterWidget` and create `/client/register` page (AC: #1)
  - [x] 1.1 In `src/components/identity/RegisterWidget.tsx`, add an optional `role` prop (default `"worker"`). Replace the hardcoded `role: "worker"` in both mock and staging paths with the prop value.
  - [x] 1.2 Create `src/app/client/register/page.tsx` — mirrors `/register` structure, passes `role="client"` to `<RegisterWidget>`, redirects to `/client/new-task` on success (pass `redirectTo="/client/new-task"` prop to RegisterWidget, or handle via query param — see Dev Notes).
  - [x] 1.3 Update `src/app/page.tsx` landing page: add a second CTA button "I'm a Client" → `/client/register` alongside the existing "Register as Worker" button.

- [x] Task 2 — Create `NewTaskForm` component (AC: #2, #3, #4, #5)
  - [x] 2.1 Create `src/components/tasks/NewTaskForm.tsx` as a `"use client"` component.
  - [x] 2.2 Use `useState` + Zod `CreateTaskSchema.safeParse()` for client-side validation (react-hook-form not installed — simpler approach used, zero new deps).
  - [x] 2.3 Fields: Title (text input), Description (textarea, 4 rows), Budget in HBAR (number input, min 1), Deadline (date input → convert to ISO datetime string before submit).
  - [x] 2.4 Call `trpc.task.create.useMutation()` on submit. On success: call `router.push("/tasks/" + data.id)` and show a success toast with the escrow TX and Hashscan link.
  - [x] 2.5 On error: display the tRPC error message (e.g., insufficient balance) as a form-level error below the submit button.
  - [x] 2.6 Show current HBAR balance via `trpc.payment.getBalance.useQuery()` above the budget field — display "Your balance: X HBAR".
  - [x] 2.7 Show `<SimulateDepositButton />` below the form (already exists at `src/components/simulate-deposit-button.tsx`). Invalidate balance query on deposit success (already handled inside `SimulateDepositButton`).

- [x] Task 3 — Create `/client/new-task` page (AC: #2, #4)
  - [x] 3.1 Create `src/app/client/new-task/page.tsx`. Protect the page: if no session, redirect to `/client/register`. Use `trpc.auth.me.useQuery()` for session check.
  - [x] 3.2 Render `<NewTaskForm />` inside the page. Page heading: "Post a New Task" / subtitle: "A verified human will complete it."
  - [x] 3.3 If session role is "worker" (a worker accidentally lands here), show a soft notice: "You're registered as a worker. Switch to client to post tasks." with a link to `/client/register`. Do NOT block — a worker who also wants to be a client can register again.

- [x] Task 4 — Add tests for form validation (AC: #5)
  - [x] 4.1 Add tests in `src/tests/task-schema.test.ts` (already exists) for form-level `CreateTaskSchema` edge cases: deadline must be a future ISO datetime, description min 10 chars, budget min 1.
  - [x] 4.2 Verify all existing tests still pass with `pnpm test`.

## Dev Notes

### What already exists — DO NOT recreate

| File | Status | Notes |
|------|--------|-------|
| `src/server/routers/task.ts` — `create` | ✅ Complete | Hedera escrow lock + balance check + DB transaction already wired (story 4.3) |
| `src/lib/schemas/index.ts` — `CreateTaskSchema` | ✅ Complete | `title` (5–100), `description` (10–1000), `budget_hbar` (int positive), `deadline` (ISO datetime string) |
| `src/components/simulate-deposit-button.tsx` | ✅ Complete | `<SimulateDepositButton />` — calls `trpc.payment.simulateDeposit`, auto-invalidates balance |
| `src/components/identity/RegisterWidget.tsx` | ✅ Exists | Currently hardcodes `role: "worker"` — needs a `role` prop (Task 1.1) |
| `src/app/register/page.tsx` | ✅ Exists | Worker registration — use as structural reference, do NOT modify |
| `src/app/tasks/page.tsx` | ✅ Exists | Task marketplace (worker view) — do NOT modify |

### `task.create` return shape (from `src/server/routers/task.ts:118`)

```typescript
return {
  ...task,            // full task row including `id`, `title`, `status`, etc.
  escrow_tx_id: escrowTxId,
  hashscanLink: hashscanUrl(escrowTxId),
};
```

Use `data.id` for redirect, `data.hashscanLink` for the success toast action.

### `RegisterWidget` role prop — minimal change

Only two lines need to change in `RegisterWidget.tsx`:

```diff
-export function RegisterWidget() {
+export function RegisterWidget({ role = "worker", redirectTo = "/tasks" }: {
+  role?: "worker" | "client";
+  redirectTo?: string;
+}) {
```

Then replace the three hardcoded `role: "worker"` → `role` and the two `router.push("/tasks")` → `router.push(redirectTo)`.

This is the minimal change that avoids duplicating the whole component.

### Deadline field: date input → ISO datetime

HTML `<input type="date">` returns `"YYYY-MM-DD"`. `CreateTaskSchema` expects a full ISO datetime string. Convert on submit:

```ts
const deadlineISO = new Date(formData.deadline + "T23:59:59.000Z").toISOString();
```

Or use `<input type="datetime-local">` and append `":00.000Z"` after confirming the value.

### Balance display

```tsx
const { data: balanceData } = trpc.payment.getBalance.useQuery(undefined, {
  enabled: !!session,
  refetchInterval: 5000, // keep live during demo
});
// balanceData?.balance ?? 0
```

### react-hook-form is already a dependency

Check `package.json` — it was added in a previous story. Import from `"react-hook-form"` and `"@hookform/resolvers/zod"` directly.

### Architecture compliance

- New pages under `src/app/client/` (worker pages under `src/app/` at root — the UX spec uses `/client/*` routes)
- Components: `src/components/tasks/NewTaskForm.tsx` (task-related components go in `tasks/` subdir)
- `"use client"` directive required on form component and new-task page (uses hooks and mutation)
- No raw SQL, no REST — all task creation through `trpc.task.create`
- No new DB schema changes needed — `tasks` table already has all required fields

### File locations reminder

All source files under `src/` (project migrated in commit `551832d`):
- App pages: `src/app/client/register/page.tsx`, `src/app/client/new-task/page.tsx`
- Components: `src/components/tasks/NewTaskForm.tsx`
- Existing to modify: `src/components/identity/RegisterWidget.tsx`, `src/app/page.tsx`

### UI patterns to follow (from existing codebase)

Look at `src/app/tasks/page.tsx` and `src/app/register/page.tsx` for the page shell pattern:
```tsx
<div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
  <main className="flex flex-col items-center gap-8 text-center px-6 py-24 max-w-md w-full">
    ...
  </main>
</div>
```

For the form itself (left-align labels):
- Use `<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">`
- Use `<input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm ...">`
- Error state: `border-red-500` + `<p className="mt-1 text-xs text-red-600">`
- Import `Button` from `@/components/ui/button`
- Use `toast` from `sonner` for success/error notifications

### UX spec reference (from `_bmad-output/planning-artifacts/ux-design.md`)

Screen 3.2 — New Task Form `/client/new-task`:
- Primary CTA: `"Post Task & Fund Escrow"` (indigo, full width)
- Loading state: `"Posting…"` + spinner
- Escrow disclaimer below button: `"By posting, you authorize escrow of the budget amount."`
- `"Simulate Deposit (Demo)"` button below the form, `outline` variant

### Testing

- Framework: Vitest (already configured, `pnpm test`)
- Add to existing `src/tests/task-schema.test.ts` (don't create a new test file)
- No browser/E2E tests needed — unit test schema edge cases only
- Check all 88+ existing tests still pass

### Cross-story context

- **Story 3.3** (unified task list) will consume the tasks created here via `task.list`
- **Story 3.4** (claim flow) depends on tasks being in the DB with `status: "open"`
- **Story 4.4** (payment release) hooks into `task.validate` — the `TODO (story 4.4)` comment in task.ts is intentionally left there
- **Do NOT touch** `task.ts` router in this story — it's complete and has been reviewed

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.2`] — Story requirements
- [Source: `_bmad-output/planning-artifacts/ux-design.md#Screen 3.2`] — Form layout and field specs
- [Source: `src/server/routers/task.ts#create`] — tRPC mutation (already complete)
- [Source: `src/lib/schemas/index.ts#CreateTaskSchema`] — Form validation schema
- [Source: `src/components/identity/RegisterWidget.tsx`] — Auth widget to extend
- [Source: `src/components/simulate-deposit-button.tsx`] — Reuse for balance top-up
- [Source: story 3.1 Dev Agent Record] — task.ts bugs fixed, myPostedTasks added, list filter added
- [Source: story 4.3 Dev Agent Record] — Hedera escrow lock wired into task.create

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Added `role` and `redirectTo` props to `RegisterWidget` (default "worker" / "/tasks") — zero breaking changes to existing worker registration flow
- Created `/client/register` page with `role="client"` + `redirectTo="/client/new-task"` — structurally mirrors `/register`
- Updated landing page: "Register as Worker" → "I'm a Worker", added "I'm a Client" → `/client/register`
- Created `NewTaskForm` component using `useState` + Zod `safeParse` (react-hook-form not in deps — eliminated dependency, same DX)
- Form: title, description, budget, deadline fields with inline error messages; balance display with 5s polling; SimulateDepositButton for demo
- Created `/client/new-task` page with session guard (redirects to `/client/register` if no session) + worker role soft notice
- Added 9 new schema edge-case tests to `task-schema.test.ts` (all pass: 21 ✓ + 9 todos)
- Pre-existing test failures (5) from story 1.3 SESSION_SECRET guard — not introduced by this story

### Change Log

- 2026-04-04: Story created from BMAD artifacts, codebase analysis, UX design spec, and story 3.1/4.3 learnings.
- 2026-04-04: Implemented all tasks — RegisterWidget extended, client register + new-task pages created, NewTaskForm with Zod validation, 9 new tests. 94/103 tests pass (5 pre-existing failures from story 1.3).

### File List

- `src/components/identity/RegisterWidget.tsx` — modified: added `role` and `redirectTo` props
- `src/app/page.tsx` — modified: "I'm a Worker" + "I'm a Client" CTA buttons
- `src/app/client/register/page.tsx` — created: client registration page
- `src/app/client/new-task/page.tsx` — created: protected task creation page
- `src/components/tasks/NewTaskForm.tsx` — created: form component with Zod validation + balance display + SimulateDepositButton
- `src/tests/task-schema.test.ts` — modified: 9 new form validation edge-case tests

### Review Findings

- [x] [Review][Patch] Deadline timezone ambiguity [src/components/tasks/NewTaskForm.tsx:60]
- [x] [Review][Patch] Inconsistent "future date" validation [src/components/tasks/NewTaskForm.tsx:78]
- [x] [Review][Patch] Button State: Post Task button does not disable for invalid inputs [src/components/tasks/NewTaskForm.tsx:142]
- [x] [Review][Patch] Notification Detail: Success toast lacks Escrow TX ID [src/components/tasks/NewTaskForm.tsx:37]
- [x] [Review][Patch] Budget Precision Loss via Truncation (parseInt) [src/components/tasks/NewTaskForm.tsx:110]
- [x] [Review][Patch] Missing JSDoc/comments for NewTaskForm logic [src/components/tasks/NewTaskForm.tsx:1]
