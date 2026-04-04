# Story 5.3: /admin Reset & Debug Route (Looping Demo)

**Status:** ready-for-dev
**Epic:** 5 — Hackathon Demo & Operations
**Depends on:** Story 1.3 (session)

---

## User Story

As a demo operator,
I want an `/admin` page and `/api/admin/reset` route that clears all data and nullifiers,
So that the platform is ready for a new judge in less than 5 seconds.

---

## Acceptance Criteria

- **Given** the database is populated with previous demo data
- **When** I call `POST /api/admin/reset` (with `x-admin-key` header)
- **Then** all tasks, users, and World ID nullifiers are purged
- **And** the platform returns to its initial "Greenfield" state

- **Given** I navigate to `/admin`
- **When** the page loads
- **Then** I see a "Reset Platform" button and a "Reset & Seed Demo Data" button
- **And** clicking either triggers the appropriate action with feedback

---

## Current State (Pre-implementation)

- `POST /api/admin/reset` — **already exists** at `src/app/api/admin/reset/route.ts`. Deletes nullifiers → tasks → users. Protected by `ADMIN_RESET_KEY`.
- No dedicated `/admin` UI page exists. Reset button currently lives on `/judges` page only.
- `src/server/db/seed.ts` — seed script exists but only runnable via CLI.

---

## What to Build

### 1. Extend `/api/admin/reset` with optional seeding

Add `?seed=true` query param support. When set, after clearing the DB, re-insert the demo seed data (inline, not via CLI). This allows one-click "clean + seeded" state.

**File to modify:** `src/app/api/admin/reset/route.ts`

Key changes:
- Extract seed data as a module function in `src/server/db/seed.ts` (export `runSeed(db)`)
- Import and call it when `?seed=true`
- Return `{ success, message, counts: { deleted, seeded } }`

### 2. Create `/admin` page

**File to create:** `src/app/admin/page.tsx`

UI elements:
- "Reset Platform" button — calls `POST /api/admin/reset` (clean slate)
- "Reset & Seed Demo Data" button — calls `POST /api/admin/reset?seed=true`
- Status/confirmation area showing result (counts, timestamp)
- Link to `/judges` dashboard
- Warning banner ("Admin — Do not share this URL")

---

## Technical Details

### Modified: `src/server/db/seed.ts`

Export the seed logic as a callable function:

```ts
export async function runSeed(db: DrizzleDB): Promise<{ users: number; tasks: number }> {
  // ... current seed logic but returns counts
}
```

Keep the CLI entrypoint calling it.

### Modified: `src/app/api/admin/reset/route.ts`

```ts
const shouldSeed = req.nextUrl.searchParams.get("seed") === "true";
// ... delete logic ...
let seeded = null;
if (shouldSeed) {
  const counts = await runSeed(db);
  seeded = counts;
}
return NextResponse.json({ success: true, message, seeded, timestamp });
```

### New: `src/app/admin/page.tsx`

Client component. Uses `fetch` directly (no tRPC needed).
- Two buttons with loading states
- Reads `NEXT_PUBLIC_ADMIN_RESET_KEY` for the header
- Toast feedback via sonner (already in project)

---

## Architecture Constraints

- Use existing `ADMIN_RESET_KEY` / `NEXT_PUBLIC_ADMIN_RESET_KEY` env vars
- The `/admin` page is hidden by URL obscurity (no nav link) — no auth gate needed beyond the key
- Delete order must remain: nullifiers → tasks → users (FK safety)
- Use `sonner` toast (already used in `/judges`)
- Follow existing UI patterns: `bg-zinc-50 dark:bg-black`, shadcn Button

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/api/admin/reset/route.ts` | Modify — add `?seed=true` support |
| `src/server/db/seed.ts` | Modify — export `runSeed()` function |
| `src/app/admin/page.tsx` | Create — admin UI page |

---

## Completion Checklist

- [ ] `runSeed()` exported from seed.ts and works correctly
- [ ] `?seed=true` param adds seeded data after reset
- [ ] Reset response includes counts
- [ ] `/admin` page renders with two action buttons
- [ ] Both buttons show loading state and toast on success/error
- [ ] Works with `NEXT_PUBLIC_ADMIN_RESET_KEY=dev-reset-key`
