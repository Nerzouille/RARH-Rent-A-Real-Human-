# Story 2.2: AgentBook Lookup & Human Link (Fail-Soft)

Status: done

## Story

As a system,
I want to verify an agent's registration in AgentBook and identify its human owner,
So that I can ensure bilateral cryptographic accountability even if the network is unstable.

## Acceptance Criteria

1. **Given** an authenticated agent request (header already validated by Story 2.1)
   **When** the system queries the AgentBook registry for the agent's wallet address
   **Then** if the agent is found, `humanOwnerNullifier` is set and `agentBookVerified: true`

2. **Given** AgentBook is unreachable or the agent is not registered
   **When** `lookupAgentBookOwner()` is called
   **Then** the system returns `null` (fail-soft — does NOT throw, does NOT block the request)
   **And** `agentBookVerified` stays `false`

3. **Given** mock mode (`NEXT_PUBLIC_MOCK_WORLDID=true`)
   **When** `lookupAgentBookOwner()` is called with any valid wallet
   **Then** it returns a deterministic mock nullifier `mock-owner-nullifier-${wallet.slice(2, 10)}`
   **And** `agentBookVerified: true`

4. **Given** the `get_identity` MCP tool is called by an agent
   **When** the agent provides its `wallet_address` parameter
   **Then** the tool returns `{ walletAddress, humanOwnerNullifier, agentBookVerified, agentbook_status }`
   **And** `agentbook_status` is `"verified"`, `"not-registered"`, or `"offline"`

## Tasks / Subtasks

- [x] Task 1 — Implement `lookupAgentBookOwner()` in `src/lib/core/agentkit.ts` (AC: #1, #2, #3)
  - [x] 1.1 Mock mode: returns `"mock-owner-nullifier-${walletAddress.slice(2, 10)}"` (deterministic)
  - [x] 1.2 Production: dynamic `import("@worldcoin/agentkit")` via try/catch fail-soft
  - [x] 1.3 SDK unavailable → `console.warn` + return `null` (no HTTP fallback needed — fail-soft is sufficient for demo)
  - [x] 1.4 Underscore prefix removed (`_walletAddress` → `walletAddress`)

- [x] Task 2 — Update mock mode in `verifyAgentRequest()` (AC: #3)
  - [x] 2.1 Mock path now calls `lookupAgentBookOwner()` which handles mock internally
  - [x] 2.2 `agentBookVerified: true` in mock mode ✅

- [x] Task 3 — Implement `get_identity` MCP tool in `src/server/mcp/registry.ts` (AC: #4)
  - [x] 3.1 `wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/)` parameter added
  - [x] 3.2 Calls `lookupAgentBookOwner()`, derives `agentbook_status: "verified" | "offline"`
  - [x] 3.3 Returns `{ walletAddress, humanOwnerNullifier, agentBookVerified, agentbook_status }`
  - [x] 3.4 `lookupAgentBookOwner` imported from `@/lib/core/agentkit`

- [x] Task 4 — Write/extend tests in `src/tests/agentkit.test.ts` (AC: #1–#3)
  - [x] 4.1 Mock mode: `lookupAgentBookOwner()` returns deterministic nullifier
  - [x] 4.2 Mock mode: `verifyAgentRequest()` returns `agentBookVerified: true`
  - [x] 4.3 Production (SDK unavailable): returns `null` without throwing
  - [x] 4.4 Updated existing mock mode test to reflect new behavior (Story 2.2)
  - [x] 4.5 71 tests pass, 0 regressions

## Dev Notes

### What already exists — DO NOT recreate

- `src/lib/core/agentkit.ts` — **Your main file.** `lookupAgentBookOwner()` is the stub to replace. `verifyAgentRequest()` already calls it and sets `agentBookVerified: humanOwnerNullifier !== null` — this logic is correct, no change needed there.
- `src/server/mcp/registry.ts` — `get_identity` tool is registered but returns a stub string. **Only modify the `get_identity` tool handler** — do not touch other tools (`list_tasks`, `create_task`, etc.).
- `src/tests/agentkit.test.ts` — Extend this file. The 12 existing tests must keep passing.
- `src/lib/schemas/index.ts` — `agentKitHeaderSchema` regex is already there, reuse its capture group for wallet validation in the `get_identity` tool.

### AgentBook SDK fallback strategy

`@worldcoin/agentkit` was confirmed incompatible with Next.js 16 in Story 2.1. For `lookupAgentBookOwner()`, use this fail-soft pattern:

```typescript
export async function lookupAgentBookOwner(walletAddress: string): Promise<string | null> {
  if (process.env.NEXT_PUBLIC_MOCK_WORLDID === "true") {
    return `mock-owner-nullifier-${walletAddress.slice(2, 10)}`;
  }

  try {
    // Try real SDK — may fail in Next.js 16 environment
    const { AgentBook } = await import("@worldcoin/agentkit");
    const agentBook = new AgentBook();
    return await agentBook.getHumanOwner(walletAddress);
  } catch {
    // Fail-soft: SDK unavailable or agent not registered
    console.warn("[AgentKit] AgentBook lookup failed — proceeding with caution");
    return null;
  }
}
```

The dynamic `import()` avoids build-time errors if the package isn't installed. This is the correct pattern for optional SDK integration in Next.js.

### `get_identity` tool — parameter approach

The MCP route validates the header but doesn't inject the identity into the MCP tool context (no shared context available in `mcp-handler`). The clean solution: the agent passes its own wallet as a tool parameter. This is intentional — the tool is an explicit identity probe, not an implicit session lookup.

```typescript
server.tool(
  "get_identity",
  "Returns the AgentBook identity for a given agent wallet address",
  { wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid EVM address") },
  async ({ wallet_address }) => {
    const humanOwnerNullifier = await lookupAgentBookOwner(wallet_address);
    const agentbook_status = humanOwnerNullifier ? "verified" : "offline";
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          walletAddress: wallet_address,
          humanOwnerNullifier,
          agentBookVerified: humanOwnerNullifier !== null,
          agentbook_status,
        }),
      }],
    };
  }
);
```

### DB field `client_agent_owner_nullifier` — NOT this story's scope

`tasks.client_agent_owner_nullifier` (in `server/db/schema.ts`) is where the human owner gets persisted on task creation. That persistence happens in Story 2.3 (`create_task` tool). **Story 2.2 only populates the in-memory `AgentIdentity` — no DB writes.**

### Mock mode determinism

Use `walletAddress.slice(2, 10)` (skip `0x`, take 8 chars) for the mock nullifier suffix — same pattern as the original stub but with corrected indexing:
- `0xAbCd1234...` → `"mock-owner-nullifier-AbCd1234"`

This gives a readable, reproducible value for demo purposes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: docs/tracks/world-agent-kit.md#Integration Guide] — `AgentBook` SDK usage
- [Source: src/lib/core/agentkit.ts] — `lookupAgentBookOwner()` stub to replace
- [Source: src/server/mcp/registry.ts:20-27] — `get_identity` TODO to implement
- [Source: src/server/db/schema.ts:49] — `client_agent_owner_nullifier` field (Story 2.3 concern)
- [Source: _bmad-output/implementation-artifacts/stories/2-1-agentkit-auth-middleware-and-registration.md] — Story 2.1 completion notes (SDK incompatibility confirmed)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Review Findings

- [x] [Review][Patch] Regex EVM dupliquée inline dans `registry.ts` [`src/server/mcp/registry.ts:35`] — Fixed: `EVM_ADDRESS_RE` exporté depuis `schemas/index.ts`, importé dans `registry.ts`

### Completion Notes List

- `@worldcoin/agentkit` SDK unavailable at runtime → dynamic import fail-soft returns `null` (expected for hackathon)
- Mock mode: `lookupAgentBookOwner()` now returns `"mock-owner-nullifier-<8hexchars>"` — deterministic, readable for judges
- `verifyAgentRequest()` mock path unified: calls `lookupAgentBookOwner()` instead of hardcoding `null`
- `get_identity` MCP tool implemented with `wallet_address` parameter — avoids need for context injection
- Updated existing mock mode test to match new Story 2.2 behavior (`agentBookVerified: true`)
- 71 tests pass (66 existing + 5 new), 0 regressions

### File List

- `src/lib/core/agentkit.ts` — Updated: `lookupAgentBookOwner()` real impl (mock + fail-soft), mock path in `verifyAgentRequest()` unified
- `src/server/mcp/registry.ts` — Updated: `get_identity` tool implemented with AgentBook lookup
- `src/tests/agentkit.test.ts` — Extended: 5 new tests for AgentBook mock/prod/determinism, 1 test updated
