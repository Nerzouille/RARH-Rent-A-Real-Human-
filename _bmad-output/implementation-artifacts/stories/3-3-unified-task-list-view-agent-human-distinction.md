# Story 3.3: Unified Task List View (Agent/Human Distinction)

Status: review

## Story

As a verified worker,
I want to see a unified list of all available tasks with a clear distinction between agent and human clients,
So that I can choose which one I want to perform.

## Acceptance Criteria

1. **Given** I am a verified worker on `/tasks`
   **When** I view the page
   **Then** I see a list of all tasks with `status = "open"`
   **And** each card shows: title, budget (HBAR), deadline, client type badge (🤖 Agent or 👤 Human), status badge
   **And** tasks poll every 5 seconds while the tab is active.

2. **Given** I am viewing the task list
   **When** I look at a task posted by an AI agent
   **Then** I see a purple "🤖 Autonomous Agent" badge (matching `client_type === "agent"`)
   **And** when the task is posted by a human, I see a green "👤 Verified Human" badge.

3. **Given** I am a verified worker on `/tasks`
   **When** I view the page
   **Then** I see a "My Claimed Tasks" section below the available tasks listing my tasks from `trpc.task.myTasks`.

4. **Given** I am a verified **client** on `/tasks`
   **When** I view the page
   **Then** I see a "My Posted Tasks" section showing my tasks from `trpc.task.myPostedTasks`.

5. **Given** I apply a budget filter (`[All] [< 10 HBAR] [> 10 HBAR]`)
   **When** I click a filter pill
   **Then** the displayed tasks are filtered client-side (no new network call needed)
   **And** the filter persists until I switch it.

6. **Given** the task list is empty
   **When** no tasks with `status = "open"` exist
   **Then** I see: "No tasks available right now. New tasks are posted frequently — check back soon."

7. **Given** I click "View Task →" on a task card
   **When** the link is followed
   **Then** I navigate to `/tasks/[id]` (already implemented in story 3.2).

## Tasks / Subtasks

- [x] Task 1 — Create `TaskCard` component (AC: #1, #2, #7)
  - [x] 1.1 Create `src/components/tasks/TaskCard.tsx` (no `"use client"` needed — pure presentational).
  - [x] 1.2 Props: `task: Task` (import from `@/lib/schemas`). Render: title, budget, relative deadline, client-type badge, status badge, "View Task →" link to `/tasks/${task.id}`.
  - [x] 1.3 Client type badge: `client_type === "agent"` → purple pill `"🤖 Autonomous Agent"`, `client_type === "human"` → green pill `"👤 Verified Human"`.
  - [x] 1.4 Status badge colors: reuse the `statusColors` map already defined in `src/app/tasks/[id]/page.tsx` — **copy the same map into TaskCard** to keep it self-contained (no shared constant needed for MVP).
  - [x] 1.5 Deadline: display as `deadline.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })`. Pass `new Date(task.deadline)` since deadline is an ISO string from tRPC.

- [x] Task 2 — Rework `src/app/tasks/page.tsx` with real task list (AC: #1–#7)
  - [x] 2.1 Keep existing session guard (`trpc.auth.me.useQuery()` + `useEffect` redirect to `/` if no session). Keep balance display + `<SimulateDepositButton />` section.
  - [x] 2.2 Remove the hardcoded demo `<AgentIdentityCard>` blocks — they were placeholders until this story.
  - [x] 2.3 Remove the placeholder text `"Available tasks will appear here once task listings are implemented (story 3.3)"`.
  - [x] 2.4 Add `trpc.task.list.useQuery(undefined, { refetchInterval: 5000 })` for open tasks (server defaults to `status: "open"`).
  - [x] 2.5 Add filter state: `const [budgetFilter, setBudgetFilter] = useState<"all" | "lt10" | "gt10">("all")`. Filter the returned tasks array client-side: `lt10` → `task.budget_hbar < 10`, `gt10` → `task.budget_hbar >= 10`.
  - [x] 2.6 Render filter pills: `[All] [< 10 HBAR] [> 10 HBAR]` — active pill: `bg-indigo-600 text-white`, inactive: `bg-zinc-100 text-zinc-600`. Place above the task list.
  - [x] 2.7 Render filtered tasks as `<TaskCard>` components. Show empty state when filtered list is empty.
  - [x] 2.8 Add "My Claimed Tasks" section: `trpc.task.myTasks.useQuery()`. Only render section if `session.role === "worker"` AND `myTasks.length > 0`.
  - [x] 2.9 Add "My Posted Tasks" section: `trpc.task.myPostedTasks.useQuery()`. Only render section if `session.role === "client"` AND `myPostedTasks.length > 0`.

- [x] Task 3 — Tests (AC: schema + filter logic)
  - [x] 3.1 Add tests in `src/tests/task-schema.test.ts` for client type badge logic: verify `ClientTypeSchema` accepts `"agent"` and `"human"`, and the display values map correctly (unit test the mapping logic, not the component).
  - [x] 3.2 Run `pnpm test` and confirm all existing tests still pass (94+ passing expected).

## Dev Notes

### What already exists — DO NOT recreate

| File / Symbol | Status | Notes |
|---|---|---|
| `src/app/tasks/page.tsx` | ✅ Exists — MODIFY | Has session guard, balance, SimulateDepositButton, demo AgentIdentityCards to remove |
| `trpc.task.list` | ✅ Complete | `publicProcedure`, input `{status?: TaskStatusSchema}`, defaults to `"open"` |
| `trpc.task.myTasks` | ✅ Complete | `protectedProcedure`, returns tasks where `worker_nullifier = session.nullifier` |
| `trpc.task.myPostedTasks` | ✅ Complete | `protectedProcedure`, returns tasks where `client_nullifier = session.nullifier` |
| `trpc.task.get` | ✅ Complete | Used on `/tasks/[id]` — don't touch |
| `src/app/tasks/[id]/page.tsx` | ✅ Complete (story 3.2) | Task detail page with `statusColors` map — reference its color map |
| `src/components/AgentIdentityCard.tsx` | ✅ Exists | Heavy component for agent info — do NOT use in task cards (use inline badges instead) |
| `src/components/tasks/NewTaskForm.tsx` | ✅ Complete | Client-side form — don't touch |
| `src/lib/schemas/index.ts — Task, TaskStatus, ClientType` | ✅ Complete | Import `Task` type from here |

### `trpc.task.list` query shape

```typescript
// Input (optional, defaults to {})
{ status?: "open" | "claimed" | "completed" | "validated" | "expired" | "refunded" }

// Output: Task[] — full task rows from DB
// Each task has: id, title, description, budget_hbar, deadline (Date serialized as ISO string),
// status, client_type, client_nullifier, client_agent_wallet, client_agent_owner_nullifier,
// worker_nullifier, escrow_tx_id, payment_tx_id, created_at, updated_at
```

Call with no input to get open tasks (server default):
```typescript
const { data: tasks = [] } = trpc.task.list.useQuery(undefined, { refetchInterval: 5000 });
```

### Client-side filter pattern

```typescript
const [budgetFilter, setBudgetFilter] = useState<"all" | "lt10" | "gt10">("all");

const filteredTasks = tasks.filter((task) => {
  if (budgetFilter === "lt10") return task.budget_hbar < 10;
  if (budgetFilter === "gt10") return task.budget_hbar >= 10;
  return true;
});
```

### Status badge colors (from `tasks/[id]/page.tsx` — copy this)

```typescript
const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  claimed: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  validated: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-700",
  refunded: "bg-red-100 text-red-700",
};
```

### Client type badge classes

```typescript
// client_type === "agent" → purple
"inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2.5 py-0.5 text-xs font-medium"

// client_type === "human" → green
"inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-medium"
```

### TaskCard structure (for visual reference)

```tsx
// From UX spec Screen 2.1:
// [Icon?] Task Title
// Budget: 15 HBAR · Due: 3 days
// Posted by: [🤖 Autonomous Agent | 👤 Verified Human]
// Status: [OPEN]
//                         [View Task →]

function TaskCard({ task }: { task: Task }) {
  const deadline = new Date(task.deadline).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 line-clamp-2">{task.title}</h2>
      <div className="flex gap-3 text-sm flex-wrap">
        <span className="text-indigo-600 font-medium">{task.budget_hbar} HBAR</span>
        <span className="text-zinc-500">Due: {deadline}</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* client type badge + status badge */}
        <Link href={`/tasks/${task.id}`} className="text-sm text-indigo-600 hover:underline">
          View Task →
        </Link>
      </div>
    </div>
  );
}
```

### Important: Route discrepancy UX spec vs implementation

The UX spec references `/worker/dashboard` and `/worker/register` — these routes do NOT exist in the implementation. The actual routes are:
- Worker task list → `/tasks` (this page)
- Worker registration → `/register`
- Client registration → `/client/register`

**Do NOT create `/worker/dashboard` or `/worker/register` routes** — they are UX spec artifacts that were overridden by the actual implementation.

### session.role usage

```typescript
const { data: session } = trpc.auth.me.useQuery();
// session.role: "worker" | "client" | "admin"

// Show "My Claimed Tasks" only to workers
{session?.role === "worker" && myTasks.length > 0 && ( ... )}

// Show "My Posted Tasks" only to clients
{session?.role === "client" && myPostedTasks.length > 0 && ( ... )}
```

### Existing page shell pattern (keep consistent)

The current `tasks/page.tsx` uses:
```tsx
<div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
  <main className="flex flex-col items-center gap-6 text-center px-6 py-24 max-w-2xl w-full">
```

For the task list, switch `justify-center` → `items-start` and use `py-12` since content will be taller than a single centered block. Use `max-w-2xl` for cards width.

### Architecture compliance

- `src/components/tasks/TaskCard.tsx` — new file, no `"use client"` needed (pure UI, receives task as prop)
- `src/app/tasks/page.tsx` — already `"use client"`, keep that directive
- All data via tRPC — no raw fetch/REST
- No new DB schema changes
- No new packages needed

### Cross-story context

- **Story 3.4** (claim flow) will add a "Claim" button to `/tasks/[id]` — the task card "View Task →" link is the entry point
- **Story 3.5** (completion/validation) will add "Mark as Complete" + "Validate" to `/tasks/[id]`
- **Story 4.4** (payment release) is already done — `task.validate` in `task.ts` is complete
- **Do NOT add Claim/Complete/Validate buttons** in this story — that's 3.4 and 3.5 scope

### Testing

- Framework: Vitest (`pnpm test`)
- Add to existing `src/tests/task-schema.test.ts`
- Unit test: `ClientTypeSchema` already has tests — extend with client badge display mapping
- No component tests needed
- 94+ tests should pass (5 pre-existing failures from story 1.3 SESSION_SECRET are known — not yours to fix)

### References

- [Source: `epics.md#Story 3.3`] — FR9, FR10, FR11
- [Source: `ux-design.md#Screen 2.1`] — Task Card anatomy + filter bar
- [Source: `src/app/tasks/page.tsx`] — Existing page to modify
- [Source: `src/server/routers/task.ts`] — `list`, `myTasks`, `myPostedTasks` queries
- [Source: `src/app/tasks/[id]/page.tsx`] — statusColors map to reuse
- [Source: `src/components/AgentIdentityCard.tsx`] — Exists, do NOT use for list cards
- [Source: story 3.2 Dev Agent Record] — useState + Zod safeParse pattern, no react-hook-form in deps

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Created `TaskCard` component — self-contained, no `"use client"`, renders title/budget/deadline/client-type badge/status badge/"View Task →" link
- Client-type badges: purple `🤖 Autonomous Agent` (agent) and green `👤 Verified Human` (human) — inline classes, no shared constant
- Reworked `tasks/page.tsx`: removed hardcoded AgentIdentityCard demo blocks and placeholder text; wired real `trpc.task.list` with 5s polling
- Budget filter state (`all` / `lt10` / `gt10`) — client-side filter on returned tasks array; 3 toggle pills above task list
- Role-aware sections: "My Claimed Tasks" (workers only, `trpc.task.myTasks`) and "My Posted Tasks" (clients only, `trpc.task.myPostedTasks`)
- Empty state: "No tasks available right now. New tasks are posted frequently — check back soon."
- Balance display moved to compact horizontal row with SimulateDepositButton for better layout with task list
- Added 3 new tests to `task-schema.test.ts` for `ClientTypeSchema` badge mapping: 105 passing, 5 pre-existing failures from story 1.3 (not introduced here)

### Change Log

- 2026-04-04: Story created from BMAD artifacts, codebase analysis (task router, existing tasks/page.tsx, AgentIdentityCard, UX spec).
- 2026-04-04: Implemented all tasks — TaskCard component created, tasks/page.tsx reworked with real data + filter + role sections, 3 new tests. 105/119 tests pass (5 pre-existing failures from story 1.3).

### File List

- `src/components/tasks/TaskCard.tsx` — created: reusable task card with client-type badges + status badge + "View Task →"
- `src/app/tasks/page.tsx` — modified: replaced placeholder with real task list + filter + my tasks sections
- `src/tests/task-schema.test.ts` — modified: 3 new ClientTypeSchema badge mapping tests
