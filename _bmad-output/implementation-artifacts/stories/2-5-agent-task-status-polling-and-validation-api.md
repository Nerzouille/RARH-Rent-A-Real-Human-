# Story 2.5: Agent Task Status Polling & Validation API

Status: done

## Story

As an AI agent,
I want to poll my task status and validate completions via API,
So that I can manage the delegation lifecycle without human intervention.

## Acceptance Criteria

1. **Given** I have a `Task ID` for a task I own
   **When** I call `get_task_status` with `{ task_id, agent_wallet }`
   **Then** the system returns `{ task_id, status, escrow_tx_id }` if the agent owns the task
   **And** returns an error if the `agent_wallet` does not match `client_agent_wallet`

2. **Given** a task is in `completed` status
   **When** I call `validate_task` with `{ task_id, agent_wallet }`
   **Then** the system verifies agent ownership, triggers payment release, sets status → `validated`
   **And** returns `{ task_id, status: "validated", payment_tx_id }`

3. **Given** the task is not in `completed` status
   **When** I call `validate_task`
   **Then** the system returns an error without touching the task

4. **Given** the worker has no `hedera_account_id` in DB (fail-soft for demo)
   **When** payment release is attempted
   **Then** the system still validates the task but returns `payment_tx_id: "mock-payment-{task_id}"`

## Tasks / Subtasks

- [x] Task 1 — Update `get_task_status` in `registry.ts` (AC: #1)
  - [x] 1.1 `agent_wallet` param ajouté
  - [x] 1.2 Ownership check case-insensitive
  - [x] 1.3 Retourne `{ task_id, status, escrow_tx_id, agentbook_status }`

- [x] Task 2 — Update `validate_task` in `registry.ts` (AC: #2, #3, #4)
  - [x] 2.1 `agent_wallet` param ajouté
  - [x] 2.2 Ownership check
  - [x] 2.3 Guard status `=== "completed"`
  - [x] 2.4 Worker lookup par `worker_nullifier`
  - [x] 2.5 `releasePayment()` si `hedera_account_id` présent, sinon `mock-payment-{id}`
  - [x] 2.6 Update task avec `payment_tx_id`
  - [x] 2.7 Retourne `{ task_id, status: "validated", payment_tx_id }`

- [x] Task 3 — Tests in `src/tests/agent-task-validation.test.ts` (AC: #1–#4)
  - [x] 3.1 Ownership logic (case-insensitive, mismatch)
  - [x] 3.2 Guard conditions (status != completed)
  - [x] 3.3 Mock payment fallback + real payment branch
  - [x] 3.4 Response shape
  - [x] 95 tests passent, 0 régressions

## Dev Notes

### What to import in `registry.ts`
```typescript
import { releasePayment } from "@/lib/core/hedera";
import { users } from "@/server/db/schema";
```

### Ownership check — case-insensitive
```typescript
if (task.client_agent_wallet?.toLowerCase() !== agent_wallet.toLowerCase()) {
  return { content: [{ type: "text", text: JSON.stringify({ error: "Unauthorized: agent does not own this task" }) }] };
}
```

### Payment release pattern (fail-soft)
```typescript
let payment_tx_id: string;
const worker = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.nullifier, task.worker_nullifier!) });

if (worker?.hedera_account_id) {
  payment_tx_id = await releasePayment(worker.hedera_account_id, task.budget_hbar, task.id);
} else {
  payment_tx_id = `mock-payment-${task.id}`;
}
```

### References
- [Source: src/server/mcp/registry.ts] — `get_task_status` + `validate_task` stubs
- [Source: src/lib/core/hedera.ts:91] — `releasePayment(workerAccountId, budgetHbar, taskId)`
- [Source: src/server/db/schema.ts:23,50] — `hedera_account_id`, `worker_nullifier`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Completion Notes List

- `get_task_status` : ownership check case-insensitive, `agentbook_status` dérivé du nullifier en DB
- `validate_task` : double guard (ownership + status completed), worker lookup, `releasePayment` avec fallback mock
- Tests sans DB — logique pure testée (ownership, guards, payment branch, response shape)
- 95 tests passent, 0 régressions
- **E2E gap** : `validate_task` ne peut être exercé end-to-end qu'une fois les stories 3.4 (claim) et 3.5 (mark complete) implémentées — la tâche doit atteindre le status `completed` avant validation

### File List

- `src/server/mcp/registry.ts` — Updated: `get_task_status` + `validate_task` complétés, `users` + `releasePayment` importés
- `src/tests/agent-task-validation.test.ts` — New: 9 tests
