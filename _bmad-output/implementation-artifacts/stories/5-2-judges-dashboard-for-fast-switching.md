# Story 5.2: Judges Dashboard for Fast Switching

Status: done

## Story

As a demo operator,
I want a hidden "Judges Dashboard" with one-click session switching,
so that I can present all three bounty flows (Worker, Human Client, AI Agent) in under 5 minutes.

## Acceptance Criteria

1. **Given** I navigate to `/judges` (hidden route, not in nav),
   **When** the page loads,
   **Then** I see a dashboard with three pre-seeded persona buttons: "Login as Kenji (Worker)", "Login as Sophie (Client)", and "Trigger Agent Aria".

2. **Given** I am on the Judges Dashboard,
   **When** I click "Login as Kenji (Worker)",
   **Then** a session JWT is created for Kenji's pre-seeded user (role=worker), the session cookie is set, and I am redirected to `/tasks`.

3. **Given** I am on the Judges Dashboard,
   **When** I click "Login as Sophie (Client)",
   **Then** a session JWT is created for Sophie's pre-seeded user (role=client), the session cookie is set, and I am redirected to `/client/new-task`.

4. **Given** I am on the Judges Dashboard,
   **When** I click "Trigger Agent Aria",
   **Then** the system sends an MCP `create_task` call to `/api/mcp` with Aria's pre-configured agent wallet, and I see a confirmation toast with the created task ID.

5. **Given** a persona does not exist in the database (e.g. after an admin reset),
   **When** I click a persona button,
   **Then** the persona is auto-seeded (user inserted with a deterministic nullifier) before session creation.

6. **Given** no manual email/password entry is required for any session switch,
   **When** switching between personas,
   **Then** each switch completes in under 1 second.

## Tasks / Subtasks

- [x] Task 1: Create API route `POST /api/judges/switch` (AC: #2, #3, #5, #6)
  - [x] 1.1 Accept `persona` param (`kenji-worker` | `sophie-client` | `aria-agent`)
  - [x] 1.2 Define deterministic nullifiers and user data for each persona
  - [x] 1.3 Upsert user + nullifier in DB if not present (auto-seed after reset)
  - [x] 1.4 For `kenji-worker` and `sophie-client`: create session JWT, set httpOnly cookie, return redirect URL
  - [x] 1.5 For `aria-agent`: call the MCP endpoint internally with a pre-configured task payload, return task ID + escrow TX ID
  - [x] 1.6 Protect route with `ADMIN_RESET_KEY` header (same key as admin reset)

- [x] Task 2: Create `/judges` page UI (AC: #1, #2, #3, #4, #6)
  - [x] 2.1 Create `src/app/judges/page.tsx` as a client component
  - [x] 2.2 Three persona cards with name, role description, and action button
  - [x] 2.3 On click, call `POST /api/judges/switch` with the persona key
  - [x] 2.4 Handle redirect for human personas, show toast for agent persona
  - [x] 2.5 Show current session info at the top (who is logged in, or "No session")
  - [x] 2.6 Add a "Reset Platform" button that calls `POST /api/admin/reset`
  - [x] 2.7 Style with Tailwind + shadcn/ui Card, Button components

- [x] Task 3: Wire up tRPC `auth.me` for session display (AC: #1)
  - [x] 3.1 Use existing `auth.me` query on the judges page to show current session

## Dev Notes

### Architecture & Patterns

- **Session creation**: Reuse `createSession()` from `src/lib/core/session.ts` and `SESSION_COOKIE_OPTIONS`. The session payload shape is `{ nullifier: string, role: "worker" | "client" | "admin", userId: string }` (see `src/lib/schemas/index.ts:78-84`).
- **Cookie setting in API routes**: Use `cookies()` from `next/headers` to set the `session` cookie, same pattern as `src/server/routers/auth.ts:27-28`.
- **Admin protection**: Reuse the `x-admin-key` header check pattern from `src/app/api/admin/reset/route.ts:8`.
- **MCP agent call**: For "Trigger Agent Aria", POST to `/api/mcp` (see `src/app/api/[transport]/route.ts`) with headers `x-agentkit-auth: <aria-wallet-address>` and a JSON-RPC body calling `create_task`.
- **DB operations**: Use `db` from `src/lib/db` and schema from `src/server/db/schema.ts`. Upsert users with `onConflictDoUpdate` on `nullifier`, insert nullifiers with `onConflictDoNothing` (same pattern as `src/lib/core/auth-register.ts:33-42`).

### Pre-seeded Persona Data

Use deterministic values so personas survive resets and are reproducible:

| Persona | Nullifier | Role | Redirect |
|---------|-----------|------|----------|
| Kenji (Worker) | `judge-demo-kenji-worker` | worker | `/tasks` |
| Sophie (Client) | `judge-demo-sophie-client` | client | `/client/new-task` |
| Aria (Agent) | N/A (agent wallet: `0x-demo-agent-aria`) | agent | N/A (toast) |

Sophie should be seeded with `hbar_balance: 500` so she can immediately create tasks with escrow.

### Project Structure Notes

- New API route: `src/app/api/judges/switch/route.ts`
- New page: `src/app/judges/page.tsx`
- No changes to existing files required
- Route is intentionally NOT added to navigation (hidden, accessed by URL only)

### Key Libraries

- `jose` for JWT (already used in session.ts)
- `next/headers` for cookie manipulation
- `shadcn/ui` Card, Button components (already installed)
- `sonner` or existing toast system for agent trigger feedback

### What NOT to Do

- Do NOT create a new auth system - reuse `createSession()` directly
- Do NOT add this route to the main navigation
- Do NOT require any password or World ID verification for judge personas
- Do NOT create a new tRPC router for this - use a plain Next.js API route (simpler for a demo utility)

### References

- [Source: src/lib/core/session.ts] - Session creation and cookie options
- [Source: src/lib/core/auth-register.ts] - User + nullifier upsert pattern
- [Source: src/server/db/schema.ts] - DB schema for users, nullifiers, tasks
- [Source: src/app/api/admin/reset/route.ts] - Admin key protection pattern
- [Source: src/lib/schemas/index.ts#SessionPayload] - Session payload shape
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] - Original requirements

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- API route `POST /api/judges/switch` created with admin key protection, persona upsert, session creation for human personas, and MCP trigger for agent persona
- Judges dashboard page at `/judges` with 3 persona cards (Kenji Worker, Sophie Client, Aria Agent), current session display via tRPC `auth.me`, and platform reset button
- Sophie seeded with 500 HBAR balance for immediate task creation
- Added `NEXT_PUBLIC_ADMIN_RESET_KEY` to .env.example for client-side admin key access
- 5 new tests covering session creation, persona validation, and schema compliance
- All 137 tests pass (0 regressions)

### Review Findings

- [x] [Review][Decision] NEXT_PUBLIC_ exposes admin key to all browsers — accepted for hackathon, page is hidden
- [x] [Review][Decision] Button labels missing role suffix (AC#1) — kept current design, role visible on card
- [x] [Review][Patch] CRITICAL: x-agentkit-auth header invalid — FIXED: valid 40-hex wallet + "AgentKit " prefix
- [x] [Review][Patch] Agent toast doesn't display task ID (AC#4) — FIXED: parse taskId/escrowTxId from MCP response
- [x] [Review][Patch] req.json() without try/catch — FIXED: returns 400 on malformed body
- [x] [Review][Patch] onConflictDoUpdate missing hbar_balance — FIXED: upsert now includes hbar_balance
- [x] [Review][Patch] cookies().set() may not propagate — FIXED: use response.cookies.set() pattern
- [x] [Review][Patch] Non-atomic user + nullifier insert — FIXED: wrapped in db.transaction
- [x] [Review][Defer] Self-fetch /api/mcp may deadlock in serverless [route.ts:89] — deferred, architectural pattern
- [x] [Review][Defer] Tests don't cover API route or DB logic [judges-switch.test.ts] — deferred, large scope for hackathon
- [x] [Review][Defer] Error details leaked to client in MCP/agent responses [route.ts:135-140] — deferred, acceptable for hackathon demo

### Change Log

- 2026-04-04: Initial implementation of story 5.2 - all tasks complete
- 2026-04-04: Code review completed — 2 decisions needed, 6 patches, 3 deferred, 5 dismissed

### File List

- src/app/api/judges/switch/route.ts (new)
- src/app/judges/page.tsx (new)
- src/tests/judges-switch.test.ts (new)
- .env.example (modified)

### Review Findings

- [x] [Review][Patch] Critical Exposure of Admin Credentials (NEXT_PUBLIC_) — FIXED: removed exposure, added key input
- [x] [Review][Patch] Server Deadlock Risk (self-fetch) — FIXED: direct tool call
- [x] [Review][Patch] Mismatch in Escrow TX ID field name (toast) — FIXED: mapped taskId and escrowTxId
- [x] [Review][Patch] Ghost sessions after reset — FIXED: clear cookie on reset
- [x] [Review][Patch] Kenji-worker seeded with 0 HBAR — FIXED: seeded with 50 HBAR
- [x] [Review][Defer] Incomplete MCP error handling (JSON parsing) — deferred, architectural
