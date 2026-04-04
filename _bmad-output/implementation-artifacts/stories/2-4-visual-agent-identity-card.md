# Story 2.4: Visual Agent Identity Card

Status: done

## Story

As a user (worker or judge),
I want to see a visual "Identity Card" for agent clients,
So that I can verify their cryptographic link to a human owner in the UI.

## Acceptance Criteria

1. **Given** I am viewing a task created by an AI agent
   **When** I look at the "Client Info" section
   **Then** I see the agent's wallet address (truncated) and a clear "Autonomous Agent" label

2. **Given** the AgentBook lookup was successful (`agentBookStatus: "verified"`)
   **When** I view the Identity Card
   **Then** I see the human owner's nullifier (truncated) with a green "Verified" badge

3. **Given** the AgentBook lookup failed (`agentBookStatus: "offline"` or `"not-registered"`)
   **When** I view the Identity Card
   **Then** I see an amber/yellow warning badge "AgentBook Offline — Caution"
   **And** the card still renders (fail-soft)

4. **Given** story 3.3 is not yet implemented
   **When** a judge visits the tasks page
   **Then** a demo preview of the `AgentIdentityCard` is visible with mock data

## Tasks / Subtasks

- [x] Task 1 — Create `src/components/AgentIdentityCard.tsx` (AC: #1, #2, #3)
- [x] Task 2 — Add demo preview to `src/app/tasks/page.tsx` (AC: #4) — deux cards : verified + offline
- [x] Task 3 — TypeScript propre sur nos fichiers (2 erreurs pre-existantes: dotenv + agentkit SDK)

## Dev Notes

### Style rules (strict)
- Tailwind utility classes only — no custom CSS, no inline styles
- Use existing `Button` from `@/components/ui/button` if needed
- Pattern reference: `src/components/simulate-deposit-button.tsx`
- Dark mode: always pair `text-zinc-900` with `dark:text-zinc-50` etc.

### Component interface
```tsx
interface AgentIdentityCardProps {
  walletAddress: string;
  humanOwnerNullifier: string | null;
  agentBookVerified: boolean;
  agentBookStatus: "verified" | "not-registered" | "offline";
}
```

### File location
`src/components/AgentIdentityCard.tsx` — NOT in `features/` (it's a display component, not business logic)

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Completion Notes List

- Composant pur (no `"use client"` — pas d'état, pas de hooks)
- Deux états visuels : badge vert "Verified" avec nullifier tronqué, badge amber "AgentBook Offline — Caution"
- Badge violet "Autonomous Agent" pour distinguer clairement des clients humains
- Demo preview dans tasks page avec deux cards (verified + offline) visible avant story 3.3
- 87 tests, 0 régressions

### File List

- `src/components/AgentIdentityCard.tsx` — New: composant UI, Tailwind only, dark mode
- `src/app/tasks/page.tsx` — Updated: import + demo preview section
