# Story 1.3: Server-Side Proof Validation & Session

Status: done

## Story

As a system,
I want to validate World ID proofs server-side and create a persistent user session,
So that I can ensure identity is not forgeable via client-side manipulation.

## Acceptance Criteria

1. **Given** the backend receives a POST request with a World ID proof
   **When** the proof is validated against the World verification API v4 or mock logic
   **Then** the verification happens entirely server-side
   **And** the proof is forwarded as-is to `https://developer.world.org/api/v4/verify/{RP_ID}`
   **And** the server fails closed if the verification response is invalid or unsuccessful.

2. **Given** the proof is valid for the `register` action
   **When** the registration flow completes
   **Then** a `users` record exists for the nullifier
   **And** a `nullifiers` record exists for `(nullifier, action="register")`
   **And** a duplicate registration attempt with the same nullifier is rejected with `HUMAN_ALREADY_REGISTERED`.

3. **Given** a registration succeeds
   **When** the backend returns to the client
   **Then** an httpOnly `session` cookie is issued with the existing JWT session payload
   **And** the cookie settings are consistent across the REST route and the tRPC mutation.

4. **Given** a later human mutation request is made with a missing, invalid, or expired session
   **When** the request reaches a protected procedure
   **Then** it is rejected with an unauthorized error
   **And** no protected state mutation is performed.

## Tasks / Subtasks

- [x] Task 1 — Harden the World ID verification core (AC: #1)
  - [x] 1.1 Keep proof verification server-side in `src/lib/core/worldid.ts`; do not move any signing or verification secret to the client.
  - [x] 1.2 Stop trusting a caller-provided RP identifier for internal verification paths; use the server-configured RP ID as the source of truth.
  - [x] 1.3 Validate the World API response before treating it as success: require a successful response payload and a usable nullifier.
  - [x] 1.4 Preserve mock mode behaviour for local/demo work without changing the public contract used by story 1.2.

- [x] Task 2 — Centralize registration persistence and session issuance (AC: #2, #3)
  - [x] 2.1 Extract the shared "verify proof -> reject duplicate -> upsert user -> insert nullifier -> create session" flow into one server-side helper.
  - [x] 2.2 Make both `src/app/api/verify-proof/route.ts` and `src/server/routers/auth.ts` use that helper instead of maintaining duplicate logic.
  - [x] 2.3 Ensure the session cookie is set only after successful persistence and uses one shared cookie configuration.

- [x] Task 3 — Audit and preserve downstream session protection (AC: #4)
  - [x] 3.1 Keep `protectedProcedure` as the gate for human-authenticated mutations.
  - [x] 3.2 Verify that the current protected task/payment procedures still reject missing or invalid sessions after the refactor.
  - [x] 3.3 Do not weaken existing authorization semantics while refactoring auth flows.

- [x] Task 4 — Add proof-validation and session regression tests (AC: #1, #2, #3, #4)
  - [x] 4.1 Add integration coverage for `auth.register`: successful registration persists the user/nullifier and sets the `session` cookie.
  - [x] 4.2 Add coverage for duplicate registration returning `HUMAN_ALREADY_REGISTERED`.
  - [x] 4.3 Add coverage for verification failure / invalid upstream response failing closed.
  - [x] 4.4 Add coverage proving a protected mutation rejects missing or invalid sessions.

## Dev Notes

### Story intent

This story is not greenfield. The core registration flow already existed and was already used by story 1.2. The job here was to make that server-side flow trustworthy, reusable, and regression-tested before Epic 3 and Epic 5 depend on it.

### What already exists (DO NOT recreate)

| File | Status | Notes |
|------|--------|-------|
| `src/lib/core/worldid.ts` | ✅ Exists | Signs RP context and verifies proofs, including mock mode |
| `src/lib/core/session.ts` | ✅ Exists | Creates and verifies JWT session tokens |
| `src/app/api/verify-proof/route.ts` | ✅ Exists | REST path that verifies proof, persists user/nullifier, sets cookie |
| `src/server/routers/auth.ts` | ✅ Exists | `auth.register` tRPC mutation used by story 1.2 |
| `src/server/context.ts` | ✅ Exists | Reads `session` cookie and resolves session into context |
| `src/lib/trpc/server.ts` | ✅ Exists | `protectedProcedure` rejects unauthenticated requests |
| `src/tests/mock-flow.test.ts` | ✅ Exists | Mock flow and session roundtrip smoke coverage |
| `src/tests/registration.test.ts` | ⚠️ Partial | Contains auth integration todos that should be completed in this story |

### Gaps / risks discovered during story creation

1. `auth.register` and `/api/verify-proof` currently duplicate the same persistence and session logic. That increases drift risk.
2. Verification helpers currently accept a caller-provided `rp_id`; for story 1.3, the server should treat its own RP configuration as authoritative.
3. `verifyWorldIDProof()` currently treats any successful HTTP status as verified without asserting the response shape beyond `nullifier`.
4. Session protection already exists via `protectedProcedure`, but there is no explicit regression test that invalid/missing sessions cannot mutate protected resources.

### World ID implementation guardrails

- Use the World ID 4.0 verification endpoint:
  - `https://developer.world.org/api/v4/verify/{RP_ID}`
- Use the RP ID, not the app ID, in the verification path.
- Forward the IDKit proof body as-is to the verification API.
- Keep RP signing and verification server-side only.
- Fail closed if World verification is unreachable or returns an invalid payload.

These points are repeated in both:
- `docs/tracks/world-id-4.md`
- `docs/poc-postmortem/worldID+agentKit-Integration.md`

### Postmortem lessons to carry into implementation

- Do not call the legacy v2 endpoint.
- Do not use `developer.worldcoin.org`; use `developer.world.org`.
- Do not reshape the proof payload before verification.
- Preserve mock-mode support because it is part of the team hackathon workflow and story 1.2 depends on it.

### Architecture compliance

- Keep third-party protocol wrappers in `src/lib/core/`.
- Keep tRPC auth routes in `src/server/routers/`.
- Keep session parsing in `src/server/context.ts`.
- Keep auth failures explicit via `TRPCError` or structured REST errors; do not swallow verification errors.
- Maintain the existing JWT-in-httpOnly-cookie approach described in architecture and already used elsewhere in the codebase.

### Suggested implementation approach

1. Introduce a shared server helper for registration completion, likely under the existing auth/identity server boundary.
2. Refactor both REST and tRPC registration paths to consume that helper.
3. Tighten proof validation semantics in `worldid.ts`.
4. Fill the current auth/session integration test gaps before touching dependent stories.

### Testing

- Framework: Vitest
- Existing relevant tests:
  - `src/tests/worldid.test.ts`
  - `src/tests/mock-flow.test.ts`
  - `src/tests/registration.test.ts`
- Run:
  - `pnpm test`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` - Story 1.3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` - Authentication & Security]
- [Source: `_bmad-output/planning-artifacts/prd.md` - World ID demo flow and protected actions]
- [Source: `docs/tracks/world-id-4.md`]
- [Source: `docs/poc-postmortem/worldID+agentKit-Integration.md`]
- [Source: `_bmad-output/implementation-artifacts/stories/1-1-setup-world-id-staging-and-mock-mode.md`]
- [Source: `_bmad-output/implementation-artifacts/stories/1-2-worker-registration-with-idkit-widget.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Removed caller-provided `rpId` from `verifyWorldIDProof` — server now always uses `WORLD_RP_ID` env var (Task 1.2)
- Added explicit nullifier validation in real-mode: throws if response lacks a non-empty string nullifier (Task 1.3)
- Created `src/lib/core/auth-register.ts` with `completeRegistration()` helper and `HumanAlreadyRegisteredError` — eliminates duplication between REST and tRPC paths (Task 2.1)
- Added `SESSION_COOKIE_OPTIONS` constant to `session.ts` — one definition, used by both callers (Task 2.3)
- `auth.ts` keeps `rp_id` as optional in the input schema for backward-compat with `RegisterWidget.tsx` (story 1.2), but ignores it server-side
- `protectedProcedure` was already correct — no changes needed; verified via new regression tests (Task 3)
- Updated `worldid.test.ts` with 4 real-mode validation tests covering: non-OK response, missing nullifier, missing env var, correct RP ID usage
- Filled `registration.test.ts` integration stubs with: `completeRegistration` success + duplicate error tests (mocked DB via `vi.doMock`), and `protectedProcedure` UNAUTHORIZED tests
- All existing tests preserved and updated for the new `verifyWorldIDProof` signature (88 tests pass, 9 todo)

### Change Log

- 2026-04-04: Story created from BMAD artifacts, current codebase, World ID track docs, and integration postmortem.
- 2026-04-04: Implemented all tasks — worldid.ts hardened, auth-register.ts created, both registration paths unified, tests added. 88/88 tests pass.

### File List

- `src/lib/core/worldid.ts` — modified: removed rpId param, use WORLD_RP_ID env var, validate nullifier in response
- `src/lib/core/session.ts` — modified: added SESSION_COOKIE_OPTIONS constant
- `src/lib/core/auth-register.ts` — created: completeRegistration() helper + HumanAlreadyRegisteredError
- `src/app/api/verify-proof/route.ts` — modified: uses completeRegistration(), SESSION_COOKIE_OPTIONS
- `src/server/routers/auth.ts` — modified: uses completeRegistration(), SESSION_COOKIE_OPTIONS; rp_id now optional
- `src/tests/worldid.test.ts` — modified: updated to new verifyWorldIDProof signature + 4 new real-mode tests
- `src/tests/mock-flow.test.ts` — modified: updated to new verifyWorldIDProof signature
- `src/tests/registration.test.ts` — modified: filled integration stubs (completeRegistration + protectedProcedure tests)

### Review Findings

- [x] [Review][Patch] Race condition in registration [src/lib/core/auth-register.ts:24-38]
- [x] [Review][Patch] Missing JSON validation in verifyWorldIDProof [src/lib/core/worldid.ts:50]
- [x] [Review][Patch] Information leak in error handling [src/app/api/verify-proof/route.ts, src/server/routers/auth.ts]
- [x] [Review][Patch] Hardcoded secret fallback [src/lib/core/session.ts]
- [x] [Review][Patch] Empty WORLD_RP_ID guard [src/lib/core/worldid.ts:34]
- [x] [Review][Patch] Missing redirect verification in tests [src/tests/registration.test.ts]
