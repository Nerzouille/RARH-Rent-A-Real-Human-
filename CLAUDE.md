# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HumanProof** — An ETHGlobal Cannes 2026 hackathon project. A verified-human task marketplace where:
- Workers prove humanity via **World ID 4.0** (nullifier-based identity)
- AI agents can post tasks via **World AgentKit** (MCP 2.0 protocol)
- Payments flow through **Hedera Testnet** (HBAR escrow + release)

## Commands

```bash
pnpm dev          # Dev server with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint
pnpm db:push      # Push Drizzle schema to PostgreSQL
pnpm db:studio    # Open Drizzle database browser
```

No test runner is configured yet. There is no `pnpm test` script.

## Environment Setup

Copy `.env.example` to `.env.local`. For local dev, `NEXT_PUBLIC_MOCK_WORLDID=true` is the key flag — it bypasses real World ID verification with fake nullifiers. The admin reset endpoint (`POST /api/admin/reset` with `x-admin-key` header) clears all DB data for demo resets.

## Architecture

### Directory Layout

- `app/` — Next.js App Router pages and API routes
- `server/` — Backend-only: DB schema, tRPC routers, MCP registry
- `lib/` — Shared: tRPC setup, Zod schemas, core integrations (worldid, hedera, agentkit, session)
- `components/` — React components (`ui/` = shadcn/ui, `layout/` = providers)
- `features/` — Feature module stubs (agents, identity, payments, tasks) — currently empty
- `_bmad-output/` — Planning artifacts (PRD, architecture, epics, UX design, sprint stories)

### API Layer (tRPC)

All client-server communication goes through tRPC at `/api/trpc/[...trpc]`. The root router (`server/routers/index.ts`) composes three sub-routers:

- `auth` — `me` (current session), `register` (World ID verify + JWT cookie)
- `task` — CRUD for tasks; `create`/`claim`/`markComplete`/`validate` are protected
- `payment` — `simulateDeposit`, `lockEscrow`, `releasePayment`, `getBalance`

Two procedure types in `lib/trpc/server.ts`:
- `publicProcedure` — no auth
- `protectedProcedure` — requires valid session cookie, throws `UNAUTHORIZED` otherwise

### Identity: World ID 4.0

Flow: browser → `POST /api/rp-context` (signing challenge) → IDKit widget → `POST /api/verify-proof` OR `auth.register` → JWT httpOnly session cookie (24h).

`lib/core/worldid.ts` has a mock mode: when `NEXT_PUBLIC_MOCK_WORLDID=true`, `verifyWorldIDProof()` returns a fake nullifier without hitting the World ID API. Switch this off at the halfway checkpoint before demo.

Nullifiers are stored in the `nullifiers` table with a `(nullifier, action)` unique constraint to prevent one identity from registering multiple times per action type.

### Agent Integration: MCP Endpoint

`app/api/mcp/route.ts` implements MCP 2.0 JSON-RPC over HTTP:
- `GET` — returns server manifest for agent discovery
- `POST` — handles tool calls authenticated via `x-agentkit-auth` header (parses wallet address)

Tools exposed: `get_identity`, `list_tasks`, `create_task`, `get_task_status`, `validate_task`.

AgentBook lookup (human owner of agent wallet) is fail-soft — the system continues with `agentBookVerified: false` if unreachable.

### Payments: Hedera

`lib/core/hedera.ts` — Uses `@hashgraph/sdk` against Hedera Testnet.

MVP escrow model: funds stay in the platform account; TX memos (`escrow:taskId:budgetHbar`) track escrow state. Real multi-sig escrow is post-hackathon scope. `escrow_tx_id` and `payment_tx_id` on the `tasks` table store the audit trail.

### Database Schema

Three tables in `server/db/schema.ts` (PostgreSQL + Drizzle ORM):

- `users` — `id`, `nullifier` (unique World ID), `role` (worker/client/admin), `hbar_balance`, `tasks_completed`, `hedera_account_id`
- `tasks` — full task lifecycle with `status` enum (open→claimed→completed→validated→expired/refunded), separate fields for human vs. agent clients (`client_nullifier` vs. `client_agent_wallet`), `worker_nullifier`, `escrow_tx_id`, `payment_tx_id`
- `nullifiers` — `(nullifier, action)` unique pairs for replay prevention

### Session Management

`lib/core/session.ts` — JWT signed with `SESSION_SECRET`, stored as `httpOnly` cookie. `verifySession()` is called in `protectedProcedure` middleware and the tRPC context builder (`server/context.ts`).

## Sprint Planning

Stories live in `_bmad-output/implementation-artifacts/stories/`. The sprint plan is in `_bmad-output/implementation-artifacts/sprint-status.yaml`. See `PLAN.md` for team ownership, git conventions (`story/[epic]-[story]-[short-name]` branches), and checkpoint goals.
