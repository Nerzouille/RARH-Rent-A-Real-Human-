---
stepsCompleted: ['init', 'discovery', 'core-experience', 'user-journeys', 'component-strategy', 'responsive']
completedAt: '2026-04-04'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
generatedBy: 'bmad-create-ux-design (24h hackathon fast-mode)'
---

# UX Design Specification — HumanProof

**Author:** Florian
**Date:** 2026-04-04
**Project:** RARH-Rent-A-Real-Human- | ETHGlobal Cannes 2026

---

## Executive Summary

HumanProof is a trust-first human-task marketplace: every worker is biometrically verified (World ID 4.0), every client is cryptographically accountable (World AgentKit or World ID), and every payment is atomic (Hedera escrow). The UX must make cryptographic complexity invisible — the product should feel like a simple gig marketplace, with trust badges as the only surface trace of the underlying system.

**Design north star:** "Prove you're human once. Work. Get paid. Done."

---

## Design Principles

1. **Trust as ambient background** — World ID badges and Hedera TX links are visible but never blocking. Verification happens once, then recedes.
2. **Zero ambiguity at each step** — Every screen has one primary action. No dead ends.
3. **Speed over richness** — Built in 24h. Plain, functional UI. Tailwind utility classes only, no custom design system.
4. **Mobile-first layout, desktop-comfortable** — Stack vertically on mobile, expand on ≥768px.
5. **Demo-friendly** — Key integration points (Hashscan links, verification badges, TX IDs) are visible for hackathon judges.

---

## Color & Typography (Minimal System)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#4F46E5` (indigo-600) | CTAs, links, active states |
| `success` | `#16A34A` (green-600) | Verified badges, completion |
| `warning` | `#D97706` (amber-600) | Pending, escrow funded |
| `danger` | `#DC2626` (red-600) | Errors, rejected |
| `neutral-bg` | `#F9FAFB` (gray-50) | Page background |
| `card` | `#FFFFFF` | Card surfaces |
| `text-primary` | `#111827` (gray-900) | Body copy |
| `text-muted` | `#6B7280` (gray-500) | Labels, secondary text |

**Font:** System default via `font-sans` (Geist Sans already wired in `layout.tsx`).

---

## Page Structure & Navigation

### Layout Shell

```
┌─────────────────────────────────────────┐
│  [Logo: HumanProof]    [Worker] [Client] │  ← top nav, sticky
├─────────────────────────────────────────┤
│                                         │
│              <Page Content>             │
│                                         │
└─────────────────────────────────────────┘
```

- Nav height: `h-14` on mobile, `h-16` on desktop
- Two top-level roles: **Worker** and **Client** — each has its own nav link
- Wallet/auth state shown as pill: `● Verified Human` (green) or `Connect` (gray)
- No sidebar — single column on mobile, max-width centered on desktop

### Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Landing / role selector |
| `/worker/register` | Worker | World ID onboarding |
| `/worker/dashboard` | Worker | Browse + claim tasks |
| `/client/register` | Client | World ID onboarding |
| `/client/new-task` | Client | Task creation form |
| `/tasks/[id]` | Both | Task detail + status |
| `/admin` | Demo | Reset demo state |

---

## Flow 1 — Worker Onboarding

### Goal
A new worker lands, verifies their humanity with World ID, and reaches the task list — in under 2 minutes.

### Screen Sequence

```
Landing (/) → Worker Register (/worker/register) → Dashboard (/worker/dashboard)
```

---

### Screen 1.1 — Landing Page `/`

**Purpose:** Role selector. Fast orientation, no friction.

```
┌────────────────────────────────────────┐
│  HumanProof                            │
│                                        │
│  The marketplace where every worker    │
│  is a verified human. Every payment    │
│  is guaranteed.                        │
│                                        │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  I'm a Worker│  │  I'm a Client│   │
│  │  (Find tasks)│  │  (Post tasks)│   │
│  └──────────────┘  └──────────────┘   │
│                                        │
│  Already verified? → Sign in           │
└────────────────────────────────────────┘
```

**Elements:**
- Headline: `text-3xl font-bold` — max 2 lines on mobile
- Two CTA cards: equal width, `rounded-2xl border`, hover: `border-indigo-600 shadow-md`
- "Already verified?" link — small text below, `text-muted`

**Interactions:**
- "I'm a Worker" → `/worker/register`
- "I'm a Client" → `/client/register`

---

### Screen 1.2 — Worker Registration `/worker/register`

**Purpose:** World ID verification. One action, one outcome.

```
┌────────────────────────────────────────┐
│  ← Back                                │
│                                        │
│  Verify you're human                   │
│                                        │
│  HumanProof uses World ID to ensure    │
│  every worker is a unique, real human. │
│  No email. No selfie. Just proof.      │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │    [World ID IDKit Widget]       │  │  ← @worldcoin/idkit drop-in
│  │    "Verify with World App"       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  What gets stored: nothing personal.   │
│  Only a unique proof ID.               │
└────────────────────────────────────────┘
```

**States:**

| State | UI |
|-------|----|
| Idle | Widget + privacy note |
| Scanning | Widget modal open (handled by IDKit) |
| Verifying | Full-width loading bar + "Verifying proof…" |
| Success | Green checkmark + "Verified! Taking you to tasks…" → auto-redirect 1.5s |
| Duplicate | Red alert: "This World ID has already registered. Each human gets one account." |
| Error | Red alert: "Verification failed. Please try again." + retry button |

**Technical note:** `POST /api/auth/register-worker` called on IDKit `onSuccess` callback. Server validates proof + stores nullifier. Redirect to `/worker/dashboard` on 200.

---

### Screen 1.3 — Worker Dashboard `/worker/dashboard`

*(Also serves as "task browse" — see Flow 2)*

```
┌────────────────────────────────────────┐
│  HumanProof   Worker ▾    ● Verified   │
├────────────────────────────────────────┤
│                                        │
│  Available Tasks          [Filter ▾]  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 📦 Pick up package — Osaka      │  │
│  │ 15 HBAR · Due in 3 days         │  │
│  │ Posted by: 🤖 Verified Agent    │  │
│  │                    [View Task →] │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 📷 Photograph storefront — Lyon │  │
│  │ 8 HBAR · Due in 5 days          │  │
│  │ Posted by: 👤 Verified Human    │  │
│  │                    [View Task →] │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

---

## Flow 2 — Task Browse + Claim

### Goal
A verified worker browses available tasks and claims one — nullifier check happens invisibly server-side.

### Screen Sequence

```
Worker Dashboard (/worker/dashboard) → Task Detail (/tasks/[id]) → [Claim] → Task Detail (claimed state)
```

---

### Screen 2.1 — Task List (Worker Dashboard)

**Task Card Component:**

```
┌────────────────────────────────────────┐
│  [Icon] Task Title                     │
│  Budget: 15 HBAR  ·  Due: 3 days      │
│  Posted by: [🤖 Agent | 👤 Human]     │
│  Status badge: [OPEN]                  │
│                        [View Task →]   │
└────────────────────────────────────────┘
```

**Card anatomy:**
- Icon: emoji representing task category (auto-assigned or first char)
- Title: `font-semibold text-gray-900` — truncate at 2 lines
- Budget: `text-indigo-600 font-medium`
- Due date: relative time string ("3 days", "in 2 hours")
- Client type badge: `🤖 Verified Agent` (purple pill) or `👤 Verified Human` (green pill)
- Status: `OPEN` (green), `CLAIMED` (amber), `COMPLETE` (gray)
- CTA: text link `View Task →` right-aligned

**Filter bar (simplified for 24h):**
- Single-row: `[All] [Open] [< 10 HBAR] [> 10 HBAR]`
- Toggle pills, no modal, no date picker

**Empty state:**
```
No tasks available right now.
New tasks are posted frequently — check back soon.
```

**Data:** `GET /api/tasks` — poll every 5s while tab active.

---

### Screen 2.2 — Task Detail `/tasks/[id]` (Worker view, pre-claim)

```
┌────────────────────────────────────────┐
│  ← Back to tasks                       │
│                                        │
│  Pick up package from post office      │
│  Osaka, Japan                          │
│                                        │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ 15 HBAR     │  │ Due: Apr 7       │  │
│  │ Guaranteed  │  │ 2026, 18:00 JST  │  │
│  └─────────────┘  └─────────────────┘  │
│                                        │
│  Description                           │
│  Collect a package (tracking: JP123)   │
│  from the main Osaka post office on    │
│  Chuo-ku. Photo of package required    │
│  upon pickup. Drop-off not needed.     │
│                                        │
│  Posted by                             │
│  🤖 Verified Agent                     │
│  Owner: World ID verified human        │
│                                        │
│  ┌────────────────────────────────┐    │
│  │        Claim This Task         │    │  ← primary CTA
│  └────────────────────────────────┘    │
│                                        │
│  Payment is held in escrow until       │
│  your work is validated. Then          │
│  released automatically.               │
└────────────────────────────────────────┘
```

**Claim button states:**

| State | Button | Note |
|-------|--------|------|
| Idle | `Claim This Task` (indigo) | Full width |
| Loading | `Claiming…` + spinner | Disabled |
| Success | Redirect to claimed state | |
| Already claimed | `Task already claimed` (gray, disabled) | |
| Not verified | `Verify with World ID to claim` | Links to `/worker/register` |

**Claim flow:**
1. User taps "Claim This Task"
2. `POST /api/tasks/[id]/claim` — server checks nullifier, sets task status to `claimed`
3. On 200: page reloads to claimed state (same URL)
4. On 409 (duplicate): show error toast

---

### Screen 2.3 — Task Detail (Claimed State — Worker View)

```
┌────────────────────────────────────────┐
│  ← Back to tasks                       │
│                                        │
│  ✅ You've claimed this task            │
│                                        │
│  Pick up package from post office      │
│  Osaka, Japan                          │
│                                        │
│  [15 HBAR]  [Due: Apr 7]              │
│                                        │
│  Status: IN PROGRESS                   │
│                                        │
│  When you've completed the work,       │
│  tap "Mark as Complete" below.         │
│  Payment releases automatically.       │
│                                        │
│  ┌────────────────────────────────┐    │
│  │      Mark as Complete          │    │  ← primary CTA
│  └────────────────────────────────┘    │
│                                        │
│  Escrow TX: [0x1234…abcd ↗]           │  ← Hashscan link
└────────────────────────────────────────┘
```

**"Mark as Complete" states:**

| State | UI |
|-------|----|
| Idle | Primary indigo button |
| Loading | `Submitting…` + spinner |
| Success | Green banner "Completion submitted! Awaiting client validation." |
| Already submitted | Gray disabled button + "Awaiting validation" |

---

## Flow 3 — Client Task Creation Form

### Goal
A verified client (human or agent-backed) posts a task with title, description, budget, and deadline — escrow funds automatically on creation.

### Screen Sequence

```
Client Register (/client/register) → New Task (/client/new-task) → Task Detail (/tasks/[id]) [client view]
```

---

### Screen 3.1 — Client Registration `/client/register`

Structurally identical to Worker Registration (Screen 1.2) with:
- Action label: `"Verify as a Client"`
- Privacy note: `"Your identity is cryptographic — no personal data stored."`
- On success → `/client/new-task`
- API: `POST /api/auth/register-client`

---

### Screen 3.2 — New Task Form `/client/new-task`

```
┌────────────────────────────────────────┐
│  ← Back                                │
│                                        │
│  Post a New Task                       │
│  A verified human will complete it.   │
│                                        │
│  Task Title *                          │
│  ┌──────────────────────────────────┐  │
│  │ e.g. "Pick up package in Osaka"  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Description *                         │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  (what exactly needs to be done) │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Budget (HBAR) *                       │
│  ┌──────────────────────────────────┐  │
│  │  15                              │  │
│  └──────────────────────────────────┘  │
│  ≈ $0.03 · Held in escrow on creation │
│                                        │
│  Deadline *                            │
│  ┌──────────────────────────────────┐  │
│  │  Apr 7, 2026                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────────────────────┐    │
│  │   Post Task & Fund Escrow      │    │  ← primary CTA
│  └────────────────────────────────┘    │
│                                        │
│  By posting, you authorize escrow      │
│  of the budget amount. You'll         │
│  validate completion before release.  │
└────────────────────────────────────────┘
```

**Form field specs:**

| Field | Type | Validation |
|-------|------|------------|
| Title | `text` | Required, 5–100 chars |
| Description | `textarea` (4 rows) | Required, 20–1000 chars |
| Budget | `number` | Required, min 1 HBAR, integer |
| Deadline | `date` | Required, must be future date |

**Inline validation:**
- Red border + helper text on blur if invalid
- `Title is required` / `Must be at least 5 characters`
- Budget: `Minimum budget is 1 HBAR`
- Deadline: `Must be a future date`

**Submit button states:**

| State | UI |
|-------|----|
| Idle | `Post Task & Fund Escrow` (indigo, full width) |
| Disabled | Gray — while any field invalid |
| Loading | `Posting…` + spinner (prevent double submit) |
| Success | Redirect to `/tasks/[id]` (client view) |
| Error | Red toast: "Failed to post task. Please try again." |

**Hackathon note:** "Simulate Deposit" button appears below the form in dev/staging mode, styled as `variant: outline` to distinguish from primary CTA.

---

### Screen 3.3 — New Task Success Toast

On redirect to `/tasks/[id]`:
- Green dismissable banner: `✅ Task posted! Escrow funded. TX: [0xabcd… ↗]`
- Auto-dismiss after 6s

---

## Flow 4 — Task Detail / Status Page

### Goal
Single URL for all parties to track task lifecycle. State drives what each role sees.

### Task Lifecycle States

```
OPEN → CLAIMED → IN_PROGRESS → PENDING_VALIDATION → COMPLETE
                                                  ↘ REFUNDED (deadline passed)
```

---

### Screen 4.1 — Task Detail: Full Layout `/tasks/[id]`

```
┌────────────────────────────────────────┐
│  ← Back                                │
│                                        │
│  [STATUS BADGE]                        │
│  Task Title                            │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ 15 HBAR  │ │ Apr 7    │ │ OPEN   │  │
│  │ Budget   │ │ Deadline │ │ Status │  │
│  └──────────┘ └──────────┘ └────────┘  │
│                                        │
│  Description                           │
│  ─────────────────────────────────     │
│  Full task description text here.      │
│                                        │
│  Posted by                             │
│  ─────────────────────────────────     │
│  [🤖 Verified Agent | 👤 Verified Human]│
│                                        │
│  Payment                               │
│  ─────────────────────────────────     │
│  Escrow TX: [0x1234…abcd ↗]           │
│  Status: Funded                        │
│                                        │
│  ──────────────────────────────────    │
│  [ROLE-BASED ACTION AREA]              │
└────────────────────────────────────────┘
```

---

### Role-Based Action Area (Bottom Section)

This section is the only part that changes by role + state:

#### Worker — OPEN task
```
┌────────────────────────────────────────┐
│  Payment is guaranteed via escrow.     │
│  ┌────────────────────────────────┐    │
│  │        Claim This Task         │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

#### Worker — CLAIMED/IN_PROGRESS task (their own)
```
┌────────────────────────────────────────┐
│  ✅ You've claimed this task            │
│  Complete the work, then tap below.    │
│  ┌────────────────────────────────┐    │
│  │       Mark as Complete         │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

#### Client — IN_PROGRESS task
```
┌────────────────────────────────────────┐
│  ⏳ Worker is completing the task       │
│  You'll be notified when they're done. │
│  (page auto-refreshes every 5s)        │
└────────────────────────────────────────┘
```

#### Client — PENDING_VALIDATION task
```
┌────────────────────────────────────────┐
│  Worker has marked this complete.      │
│  Review and validate to release       │
│  payment to the worker.                │
│  ┌────────────────────────────────┐    │
│  │       Validate & Release       │    │
│  └────────────────────────────────┘    │
│  (Payment releases automatically      │
│  when you confirm)                     │
└────────────────────────────────────────┘
```

#### Client — COMPLETE task
```
┌────────────────────────────────────────┐
│  ✅ Task complete. Payment released.    │
│  Release TX: [0x5678…efgh ↗]          │
└────────────────────────────────────────┘
```

#### Non-owner Worker — already CLAIMED task
```
┌────────────────────────────────────────┐
│  This task has been claimed.           │
│  Browse other available tasks →        │
└────────────────────────────────────────┘
```

---

### Status Badge Color Map

| Status | Badge Style |
|--------|-------------|
| OPEN | `bg-green-100 text-green-800` |
| CLAIMED | `bg-amber-100 text-amber-800` |
| IN_PROGRESS | `bg-blue-100 text-blue-800` |
| PENDING_VALIDATION | `bg-purple-100 text-purple-800` |
| COMPLETE | `bg-gray-100 text-gray-600` |
| REFUNDED | `bg-red-100 text-red-700` |

---

### Hedera TX Section (Demo-Visible)

Always rendered when `escrow_tx_id` is non-null:

```
┌────────────────────────────────────────┐
│  Hedera Escrow                         │
│  ─────────────────────────────────     │
│  Escrow TX:  [0x1234…abcd ↗]          │  ← hashscan.io/testnet/tx/...
│  Release TX: [0x5678…efgh ↗]          │  ← only shown post-COMPLETE
│  Status: [Processing… | Funded | Released] │
└────────────────────────────────────────┘
```

- TX IDs are truncated: first 6 + `…` + last 4 chars
- `↗` icon = external link to Hashscan (opens new tab)
- "Processing…" = amber spinner, appears briefly after task creation

---

## Component Inventory

Minimal set — all Tailwind utility classes, no component library required.

| Component | Used In | Notes |
|-----------|---------|-------|
| `<TaskCard>` | Dashboard | Reusable list item |
| `<StatusBadge>` | TaskCard, Detail | Color-mapped pill |
| `<WorldIDButton>` | Register screens | Wraps `@worldcoin/idkit` |
| `<ActionArea>` | Task Detail | Role+state conditional block |
| `<HashscanLink>` | Task Detail, Toast | TX link with truncation |
| `<FormField>` | New Task form | Label + input + error |
| `<LoadingSpinner>` | All CTAs | Inline, 16px |
| `<Toast>` | Post task, errors | Top-right, auto-dismiss |
| `<NavBar>` | All pages | Sticky, role + auth state |

---

## Responsive Breakpoints

| Breakpoint | Layout Change |
|-----------|---------------|
| `< 640px` (mobile) | Single column, full-width cards, stacked stat pills |
| `640–1024px` (tablet) | Same single column, wider cards, side-by-side stat pills |
| `≥ 1024px` (desktop) | Centered max-width container (`max-w-3xl`), comfortable margins |

**Key responsive behaviors:**
- TaskCard: full width on mobile, `max-w-2xl` centered on desktop
- Stat pills (Budget / Deadline / Status): row on ≥ 640px, stacked column on mobile
- NavBar: hamburger menu not needed — only 2 links, always fit in one row
- New Task form: single column always (no side-by-side fields)
- Action area buttons: always full-width (`w-full`)

---

## Error & Empty States

| Scenario | Message | Action |
|----------|---------|--------|
| No tasks available | "No tasks available right now. Check back soon." | No CTA |
| Task not found (404) | "Task not found or no longer available." | "← Back to tasks" |
| Not verified, trying to claim | "Verify your identity to claim tasks." | "Verify with World ID →" |
| Duplicate registration | "This World ID is already registered. Each human gets one account." | None (by design) |
| Network error | "Something went wrong. Please try again." | Retry button |
| Escrow funding failed | "Payment escrow failed. Task not posted." | Retry or contact |

---

## Accessibility (Baseline)

- All interactive elements: keyboard focusable, `focus-visible:ring-2 focus-visible:ring-indigo-500`
- Color alone never conveys state — all status badges include text label
- Form fields: explicit `<label>` with `htmlFor`, never placeholder-only
- Buttons: descriptive text, never icon-only
- ARIA: `role="status"` on loading states, `aria-live="polite"` on toast container
- Contrast: all text combinations pass WCAG AA (4.5:1 minimum)

---

## Hackathon-Specific UX Notes

1. **Simulate Deposit button** — on `/client/new-task`, shows in non-production only. Styled as `outline` variant, labeled "Simulate Deposit (Demo)" to distinguish from real action. Calls dedicated demo endpoint.

2. **Admin Reset** — `/admin` page: single "Reset Demo" button, full-width red. Shows confirmation modal before executing. No auth needed in demo build — document this in demo script.

3. **Hashscan links** — visible on Task Detail even when status is still "Processing". TX ID appears immediately with amber "Processing…" text that resolves to "Funded" on next poll.

4. **World ID staging** — IDKit widget uses staging `app_id` in non-production. A banner reads "Demo mode — using World ID Staging" at top of registration screen in dev/staging.

5. **No file upload** — "Mark as Complete" is a button only. No file input, no photo upload, no text field. This is intentional and should be communicated: "Completion is confirmed via validation, not file upload. (v1)"

---

## Page-by-Page Implementation Priority

| Page | Priority | Complexity | Notes |
|------|----------|------------|-------|
| `/worker/register` | P0 | Low | IDKit widget + single API call |
| `/worker/dashboard` | P0 | Low | Task list + polling |
| `/tasks/[id]` | P0 | Medium | Role/state logic |
| `/client/new-task` | P0 | Low | Form + validation |
| `/` (landing) | P1 | Trivial | Role selector only |
| `/client/register` | P1 | Low | Mirrors worker register |
| `/admin` | P2 | Trivial | Reset button |

**Suggested build order for 24h:**
1. `/worker/register` — proves World ID integration
2. `GET /api/tasks` + `/worker/dashboard` — proves data layer
3. `/tasks/[id]` with claim + complete — proves full worker flow
4. `/client/new-task` — proves client + escrow flow
5. `/` landing + polish — last 2h
