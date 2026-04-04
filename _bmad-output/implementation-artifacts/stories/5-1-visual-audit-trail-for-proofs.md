# Story 5.1: Visual Audit Trail for Proofs (Identity, Agent, Hedera)

Status: review

## Story

As a demo operator,
I want to see a visual "Audit Trail" of cryptographic events,
So that I can prove the underlying protocol integrations to judges without reading raw logs.

## Acceptance Criteria

1. **Given** a task lifecycle event (World ID check, AgentBook lookup, Hedera TX)
   **When** I view the "Audit Trail" section in the task detail view
   **Then** I see clear visual indicators: `[World ID Verified]`, `[AgentBook Checked]`, `[Hedera Payment]`

2. **Given** a task was created by a human client
   **When** I view the audit trail
   **Then** I see the client's World ID nullifier (truncated) with a success indicator

3. **Given** a task was created by an AI agent
   **When** I view the audit trail
   **Then** I see the agent wallet address and AgentBook owner nullifier (or a warning if offline)

4. **Given** a task has been claimed by a worker
   **When** I view the audit trail
   **Then** I see the worker's World ID nullifier with a success indicator

5. **Given** a task has an escrow or payment transaction
   **When** I view the audit trail
   **Then** clicking on the Hedera indicator reveals the TX ID with a Hashscan link

6. **Given** a task has not yet reached a lifecycle step
   **When** I view the audit trail
   **Then** that step appears as inactive/greyed out

## Dependencies

- Story 1.3 (World ID session — nullifiers stored on tasks)
- Story 2.2 (AgentBook lookup — agent wallet + owner nullifier on tasks)
- Story 4.3 (Hedera escrow — escrow_tx_id on tasks)

## Tasks / Subtasks

- [x] Task 1: Create `AuditTrail` component
  - [x] 1.1 Create `src/components/AuditTrail.tsx` — client component with expandable timeline
  - [x] 1.2 Build event list from task data: client identity, worker identity, escrow TX, payment TX
  - [x] 1.3 Support human client (World ID nullifier) and agent client (wallet + AgentBook owner)
  - [x] 1.4 Status indicators: success (green), pending (amber pulse), inactive (grey), warning (amber)
  - [x] 1.5 Hashscan links for non-mock Hedera TX IDs via `hashscanUrl()` from `@/lib/core/hashscan`
  - [x] 1.6 Collapsible header with mini status dots and verified count summary

- [x] Task 2: Integrate into task detail page
  - [x] 2.1 Import `AuditTrail` in `src/app/tasks/[id]/page.tsx`
  - [x] 2.2 Replace raw Hedera TX section with `AuditTrail` component
  - [x] 2.3 Remove unused local `hashscanUrl` helper (now using shared one from component)

- [x] Task 3: Update sprint status
  - [x] 3.1 Set story 5.1 to `review` and epic-5 to `in-progress` in sprint-status.yaml
