# Story 1.4: User Profile & Verification Badge

Status: done

## Story

As a user,
I want to see my verification status and "Human Verified" badge on my profile,
So that I can confirm my account is active and credible.

## Acceptance Criteria

1. **Given** I am logged in as a verified worker
   **When** I view my profile or the task marketplace header
   **Then** I see a green "Human Verified" badge with my World ID nullifier (truncated)
   **And** my reputation count (tasks completed) and HBAR balance are visible

2. **Given** I click "My profile" from the tasks page
   **When** the profile page loads
   **Then** it fetches my full user data server-side (nullifier, role, tasks_completed, hbar_balance)
   **And** displays a full-card version of the HumanVerifiedBadge

3. **Given** I am not logged in
   **When** I navigate to `/profile`
   **Then** I am redirected to the home page

4. **Given** a verified worker appears in the UI
   **When** a badge is shown
   **Then** it is visually distinct from unverified accounts (green, "Human Verified" label)

## Tasks / Subtasks

- [x] Task 1 — `auth.profile` protectedProcedure (AC: #1, #2)
  - [x] 1.1 Fetch full user record from DB using session nullifier
  - [x] 1.2 Return `{ id, nullifier, role, tasksCompleted, hbarBalance, hederaAccountId }`
  - [x] 1.3 Throw `NOT_FOUND` if user record missing

- [x] Task 2 — `HumanVerifiedBadge` component (AC: #1, #4)
  - [x] 2.1 Full card variant: nullifier (truncated), role badge, tasks/balance stats
  - [x] 2.2 Compact pill variant: green badge "Human Verified" for header use
  - [x] 2.3 Tailwind only, dark mode, no custom CSS

- [x] Task 3 — `/profile` page (AC: #2, #3)
  - [x] 3.1 Protected: redirect to `/` if no session
  - [x] 3.2 Load `auth.profile` query (enabled when session exists)
  - [x] 3.3 Display full HumanVerifiedBadge card
  - [x] 3.4 Reputation message: "X tasks completed" or "Complete your first task…"

- [x] Task 4 — Badge in tasks page header (AC: #1)
  - [x] 4.1 Compact badge pill in top-right of task marketplace header
  - [x] 4.2 "My profile" link to `/profile`

## Dev Notes

### `auth.profile` pattern
```typescript
profile: protectedProcedure.query(async ({ ctx }) => {
  const user = await db.query.users.findFirst({
    where: eq(users.nullifier, ctx.session.nullifier),
  });
  if (!user) throw new TRPCError({ code: "NOT_FOUND" });
  return { id, nullifier, role, tasksCompleted, hbarBalance, hederaAccountId };
});
```

### Component location
- `src/components/identity/HumanVerifiedBadge.tsx` — NOT in `features/`
- Pattern follows `AgentIdentityCard.tsx` (pure, no `"use client"`)

### Style rules
- Tailwind only — no inline styles, no custom CSS
- Dark mode pairs: `text-zinc-900 dark:text-zinc-50`
- Badge color: emerald (green) for verified humans, consistent with World ID branding

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Completion Notes List

- `auth.profile` uses `protectedProcedure` — session required, no unauthenticated access
- `HumanVerifiedBadge` has two variants: full card (profile page) and compact pill (header)
- `/profile` redirects to `/` if no session (client-side guard via `useEffect`)
- Badge compact in tasks header uses `session.nullifier/role` directly (no extra fetch)
- 132 tests pass, 0 regressions

### File List

- `src/server/routers/auth.ts` — Updated: `auth.profile` query added, `protectedProcedure` + DB imports
- `src/components/identity/HumanVerifiedBadge.tsx` — New: full card + compact pill variants
- `src/app/profile/page.tsx` — New: protected profile page
- `src/app/tasks/page.tsx` — Updated: compact badge + "My profile" link in header
