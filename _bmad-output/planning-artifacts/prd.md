---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
completedAt: '2026-04-04'
classification:
  projectType: web_app
  domain: marketplace_general
  complexity: high
  projectContext: greenfield
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-HumanProof.md'
  - '_bmad-output/planning-artifacts/product-brief-HumanProof-distillate.md'
  - 'docs/tracks/hedera-agentic-payments.md'
  - 'docs/tracks/world-agent-kit.md'
  - 'docs/tracks/world-id-4.md'
workflowType: 'prd'
briefCount: 2
researchCount: 0
brainstormingCount: 0
projectDocsCount: 3
---

# Product Requirements Document — HumanProof

**Author:** Florian
**Date:** 2026-04-04
**Project:** RARH-Rent-A-Real-Human- | ETHGlobal Cannes 2026

---

## Executive Summary

RentAHuman.ai validated in February 2026 that there is urgent, real demand for a marketplace where AI agents hire humans for tasks machines cannot perform alone — 600,000 signups and 4 million visits in days. The platform's structural failure is equally clear: no identity layer, no payment protection, and 32.7% of documented tasks categorized as fraudulent. HumanProof is that same idea, built correctly.

HumanProof is a web application marketplace where every worker is a biometrically verified unique human (World ID 4.0 Orb verification, server-side proof validation), every AI agent client is cryptographically linked to an accountable human owner (World AgentKit), and every payment settles in near real-time with sub-cent fees (Hedera). For the first time, both sides of every transaction have a cryptographic answer to "am I dealing with a verified human or an accountable agent?"

**Target users:**
- **Workers** — verified humans seeking task income with payment guarantees
- **Human Clients** — individuals posting tasks requiring physical presence or authentic human judgment
- **AI Agent Clients** — autonomous agents delegating irreducibly human tasks, paying autonomously at machine speed

**Built for ETHGlobal Cannes 2026** — 30-hour MVP targeting three bounties: World AgentKit ($4k), World ID 4.0 ($4k), Hedera AI & Agentic Payments ($3k). Best-case total: $11k.

### What Makes This Special

The competitive moat is cryptographic, not operational. RentAHuman.ai cannot retrofit trust — its entire user base would require re-verification and its payment system would need a full rebuild. HumanProof is trust-first by design: fake accounts and payment uncertainty are structurally impossible, not policy-enforced.

**Bilateral accountability is the novel property.** Workers know their client agent is backed by an identified, accountable human. Agents know their worker is a biometrically verified, unique human. No existing marketplace provides this symmetry at the protocol level.

The timing is structural: World ID 4.0 and World AgentKit just became available. The problem is documented and acute. As AI automates more cognitive and digital work, tasks requiring physical presence, authentic judgment, and cultural nuance become *more* valuable — HumanProof owns that market.

## Project Classification

- **Project Type:** Web application (Next.js/React SPA)
- **Domain:** Human-AI task marketplace with cryptographic identity and agentic payment infrastructure
- **Complexity:** High — novel multi-protocol stack (World ID 4.0 ZK proofs, World AgentKit beta, Hedera Agent Kit), 30-hour build constraint, bilateral trust architecture
- **Project Context:** Greenfield

## Success Criteria

### User Success

- **Worker aha moment:** First completed task results in automatic payment release — no friction, no uncertainty, no manual chase.
- **Client (human) aha moment:** Every worker in search results is provably a unique human — cryptographically enforced, not self-declared.
- **Client (agent) aha moment:** Agent posts task and funds escrow autonomously without human intervention in the payment flow.
- **Bilateral trust signal:** Both worker and client can verify the other party's identity class (verified human / human-backed agent) before committing to a transaction.

### Hackathon Success (30h — ETHGlobal Cannes 2026)

One demo flow per bounty, all three must be live and verifiable:

| Bounty | Demo Flow | Acceptance Signal |
|--------|-----------|-------------------|
| **World ID 4.0** ($4k) | Worker registers → proof validation logged server-side → nullifier stored → duplicate registration rejected | Server log + DB record visible |
| **World AgentKit** ($4k) | Agent (code) posts task → AgentBook verification logged → task appears in UI | Console log + UI state |
| **Hedera AI & Agentic Payments** ($3k) | Task created → Hedera TX ID → payment released → second Hedera TX ID | Hashscan links |

### Business Success (Post-Launch)

- **Fraud rate:** <1% of funded tasks — structural impossibility, not policy enforcement
- **Worker activation rate:** >50% of registered workers complete at least one task within 30 days
- **Task completion rate:** >80% of funded tasks reach validated completion or auto-refund within deadline
- **Agent adoption:** >10 distinct AgentKit agents using the platform within 60 days post-launch

### Technical Success

- World ID 4.0 Orb-level proof validation executes server-side on every registration and protected action — system is unusable without it
- World AgentKit agent identity verified server-side before task posting — bots and unregistered scripts are rejected
- Hedera escrow locks funds on task creation and releases on validation or deadline — no manual payment step
- Nullifier uniqueness enforced in DB — one human, one worker profile, mathematically guaranteed
- Payment settlement: Hedera finality ~3s; end-to-end target <10s

**Hackathon simplifications:**
- Auto-refund: flow architecturally wired, triggered manually during demo if needed; full Scheduled Transaction automation is post-MVP
- Proof of completion: "Mark as Complete" button — no file upload in v1
- Reputation: string indicator ("N tasks completed") seeded on completion

## User Journeys

### Journey 1: Kenji — Verified Worker (Happy Path)

Kenji is a 28-year-old in Osaka with a background in local logistics. Gig platforms keep flooding him with bots undercutting him or disappearing after he completes work.

**Opening Scene:** Kenji lands on HumanProof. The World ID verification step is different — not an email confirmation or a selfie, but biometric proof that he is a unique human. He scans with his World App. The IDKit widget fires. His proof is validated server-side. A nullifier is stored. His profile is live.

**Rising Action:** He sees a task: "Pick up a package from a post office in Osaka — 15 HBAR." The client is listed as an AI agent backed by a World ID-verified human. He clicks Claim. The system checks his nullifier server-side — he's verified, unique, eligible.

**Climax:** He completes the pickup, clicks "Mark as Complete." The client agent validates. Hedera releases the escrow instantly. His profile shows "1 task completed."

**Resolution:** Kenji didn't chase a payment. The system worked exactly as described.

*Requirements revealed: World ID registration flow, nullifier check on claim, "Mark as Complete" UI, Hedera payment release, reputation string update.*

---

### Journey 2: Aria — AI Agent Client (Core Bounty Flow)

Aria is an autonomous logistics agent whose owner registered her via World AgentKit — cryptographically linked to a human owner and registered in AgentBook.

**Opening Scene:** Aria calls the HumanProof API to post a task with title, description, budget (15 HBAR), and deadline. The request includes her AgentKit authentication headers.

**Rising Action:** HumanProof's backend calls AgentBook verification — confirms this wallet address maps to a registered human-backed agent. Task is created. Hedera escrow is funded autonomously. No human approved the payment.

**Climax:** A verified worker completes the task. Aria's validation callback fires. Hedera releases payment. Two Hedera TX IDs logged. Full audit trail on Hashscan.

**Resolution:** Aria delegated a physical-world task, paid a verified human, received confirmation — all without a human in the loop on her side.

*Requirements revealed: AgentKit authentication middleware, agent task creation API, Hedera escrow on creation, agent validation callback, Hashscan-verifiable TX IDs.*

---

### Journey 3: Sophie — Human Client (Task Poster)

Sophie needs someone in Lyon to photograph a storefront for competitive research. She's been burned by AI-generated "proof" on other platforms.

**Opening Scene:** Sophie signs up on HumanProof, verifies with World ID. She posts a task with budget and deadline, funds escrow via the platform.

**Rising Action:** A verified worker in Lyon claims the task. Sophie sees his profile — "7 tasks completed," World ID verified badge.

**Climax:** Worker marks complete. Sophie clicks Validate. Hedera releases the escrow.

**Resolution:** Real photos from a real, accountable human. Trust was cryptographic, not reputational.

*Requirements revealed: Human client registration, task posting UI, task browsing + worker profile view, validation UI, Hedera escrow.*

---

### Journey 4: Demo Operator — Hackathon Judging Flow

Three judges evaluate three bounties in ~5 minutes each.

**Setup:** Three browser tabs: HumanProof app, server logs, Hashscan. Pre-seeded: verified worker (World ID staging), registered AI agent script (World AgentKit), human client account.

- **World ID Demo:** Registration → server log showing POST to World API v4 → nullifier stored → duplicate rejected with judge-friendly error.
- **AgentKit Demo:** Agent script runs → task appears in UI → console log showing AgentBook verification + human owner World ID lookup.
- **Hedera Demo:** Simulate Deposit → task creation → Hashscan TX ID 1 (escrow) with "Processing" UI → validation → Hashscan TX ID 2 (release).
- **Reset Demo:** Call `/admin` reset route → system ready for next judge in <5s.

*Requirements revealed: Staging environment support, agent CLI script, accessible server logs, Hashscan links in UI, Simulate Deposit button, Admin Reset route.*

---

### Journey Requirements Summary

| Capability | Revealed By |
|-----------|------------|
| World ID IDKit widget + server-side proof validation | Kenji, Sophie, Demo |
| Nullifier uniqueness check on protected actions | Kenji |
| Task creation UI (human client) | Sophie |
| Task creation API (agent client) | Aria |
| AgentKit authentication middleware | Aria, Demo |
| AgentBook + human owner lookup | Aria, Demo |
| Hedera escrow on task creation | Sophie, Aria, Demo |
| Task browsing + worker profile view | Sophie |
| Task claim with nullifier check | Kenji |
| "Mark as Complete" button | Kenji |
| Client validation UI | Sophie |
| Agent validation (polling/direct) | Aria, Demo |
| Hedera payment release | Kenji, Aria, Sophie, Demo |
| Reputation string update | Kenji |
| Hashscan TX links + Processing UI | Demo |
| Simulate Deposit feature | Demo |
| Admin Reset / Demo Loop Support | Demo |
| Staging/simulator environment | Demo |

## Domain-Specific Requirements

### Identity & Privacy

- **Zero PII storage:** World ID ZK proofs reveal nothing about user identity — HumanProof stores only the nullifier. No names, emails, or biometrics transmitted.
- **Nullifier scoping:** Nullifiers are scoped per `app_id` + `action` — "register-worker" and "register-client" are independent. Each action must be defined in the World Developer Portal.
- **Credential expiry:** World ID 4.0 `expires_at_min` must be checked; expired credentials rejected with a clear message.
- **GDPR surface:** Minimal — no PII stored. IP addresses in logs and Hedera wallet addresses on-chain are pseudonymous. Log retention policy is post-launch.

### Cryptographic Key Management

- **World ID RP signing key:** Server-side only. Used to generate RP signatures per IDKit session. Stored as environment variable, never hardcoded or logged.
- **Hedera operator private key:** Controls the escrow account. Server-side only. Testnet only for hackathon — no real funds at risk.
- **AgentKit wallet key:** Agent's EVM-compatible wallet for AgentBook registration. Pre-registered before demo. Separate from operator key.
- **Key rotation:** Post-launch concern; out of MVP scope.

### Escrow Integrity

- **Atomic release:** Payment release is a single Hedera transaction — no partial releases, no manual intervention in the happy path.
- **Idempotency guard:** Server checks task status in DB before triggering Hedera release — prevents double-release.
- **Testnet only:** All Hedera transactions on Testnet. Hashscan.io/testnet for verification.

### Sybil & Bot Resistance

- **One nullifier = one worker profile:** DB enforces `UNIQUE (nullifier, action)` — duplicate registration returns a clear rejection.
- **Server-side validation on every protected action:** Task claim and escrow-gating actions check stored nullifier. Client-side trust is explicitly forbidden.
- **AgentKit verification per request:** AgentBook verification called on each agent task creation — no stale credential replay.

### Compliance & Regulatory

- **No AML/KYC required (hackathon):** Hedera Testnet HBAR is not regulated currency. Post-launch with real funds requires legal review.
- **Open source:** ETHGlobal requires public GitHub repo — all secrets via environment variables, never in repo.

### Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| RP signing key exposed | Server-side only, env var, never logged |
| Hedera operator key compromised | Testnet only for MVP; mainnet requires HSM post-launch |
| World ID nullifier collision | DB unique constraint; reject on duplicate |
| AgentBook unavailable | Fail-closed: task creation rejected |
| Hedera network congestion | Retry with exponential backoff; surface TX status to user |
| World App not installed on demo device | Use staging environment + World App simulator |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Bilateral Cryptographic Trust Symmetry**

No existing marketplace verifies both sides of a transaction at the protocol level. Every gig platform (Fiverr, Upwork, Scale AI) uses policy-based trust, not mathematical proof. HumanProof is the first system where workers are biometrically proven unique humans (World ID 4.0 ZK proof) and agent clients are cryptographically linked to accountable human owners (World AgentKit) — both validated server-side before any transaction occurs.

**2. AI Agents as First-Class Marketplace Clients**

World AgentKit enables agents to participate as identified, accountable clients with verifiable links to human owners. HumanProof is the first marketplace to treat agents as a distinct identity class — not users mimicking humans, but a separate client type with their own auth flow and payment path.

**3. Machine-Speed Agentic Payment Rails**

Hedera's infrastructure — sub-second finality, sub-cent fees, native token operations — enables an AI agent to post a task, fund escrow, and release payment to a human worker entirely autonomously, at machine speed, with a verifiable on-chain audit trail. This is a different category from existing gig platform payment rails.

**4. Novel Protocol Combination**

Three protocols integrated for the first time in a single product:
- **World ID 4.0** — ZK proof of unique humanness, server-side RP verification
- **World AgentKit** — Agent identity anchored to human World ID, AgentBook registry
- **Hedera Agent Kit** — Autonomous payment execution at machine speed

### Market Context & Competitive Landscape

- **RentAHuman.ai** (Feb 2026): Proved demand (600k signups, 4M visits). No identity layer, 32.7% fraud. Cannot retrofit trust without full rebuild.
- **Fiverr / Upwork**: Human-to-human only. No agent client concept. Payment rails incompatible with machine-speed autonomous transactions.
- **Scale AI / Mechanical Turk**: AI training data labeling, not a general task marketplace. No agent-as-client model.
- **No direct competitor** has implemented bilateral cryptographic trust + agentic payment rails in a deployed marketplace.

**Why now:** World ID 4.0, World AgentKit, and Hedera Agent Kit all became available within months of each other. RentAHuman.ai proved demand in February 2026. The window is open.

### Validation Approach

- **Hackathon:** Three working bounty demos prove protocol integrations are real, not theoretical.
- **Post-hackathon:** Fraud rate <1% vs. RentAHuman.ai's 32.7% is the primary measurable proof.
- **Agent adoption:** Number of distinct AgentKit agents signals whether the agent-as-client model resonates with the developer community.

### Innovation Risk Mitigation

| Innovation Risk | Mitigation |
|----------------|-----------|
| World AgentKit is beta — API may change | Pin to specific version; monitor World docs |
| AgentBook registration requires pre-setup | Pre-register agent wallet before hackathon starts |
| Novel combination = no prior art to reference | Build minimal integration for each protocol separately first, then combine |
| Judges may not understand bilateral trust concept | Demo script explicitly narrates both sides of each transaction |

## Technical Architecture

HumanProof is a Next.js web application (React SPA with API routes) targeting modern desktop browsers. No mobile-native app, no PWA for v1. Three distinct user flows — worker onboarding, human client task management, AI agent API integration — share a single codebase.

### Rendering & State

- Next.js App Router; client-side rendering for authenticated views
- Server-side API routes for all sensitive operations: World ID proof validation, AgentKit verification, Hedera transactions
- Lightweight client state (React context or Zustand) for auth session and task list
- Task status polling at 3-5s interval — no WebSocket in v1

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/rp-context` | Generate RP signature server-side |
| POST | `/api/auth/register-worker` | World ID proof validation + nullifier storage |
| GET | `/api/tasks` | List available tasks |
| POST | `/api/tasks` | Create task (human client or agent client) |
| POST | `/api/tasks/[id]/claim` | Claim task (nullifier check) |
| POST | `/api/tasks/[id]/complete` | Mark as Complete |
| POST | `/api/tasks/[id]/validate` | Validate completion + trigger Hedera release |

Agent clients use `POST /api/tasks` with AgentKit auth header. All mutation endpoints require server-side identity verification before state change.

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome 120+ | Full (primary) |
| Firefox 120+ | Full |
| Safari 17+ | Full (World App QR display required) |
| Mobile | Not targeted for v1 |

Desktop-first (1024px+). Functional on tablet (768px+), not optimized.

### Database Schema (MVP)

- `users` — nullifier, role (worker/human_client), reputation_count
- `tasks` — id, title, description, budget_hbar, deadline, status, escrow_tx_id, client_nullifier, worker_nullifier
- `nullifiers` — nullifier, action, verified_at (`UNIQUE` constraint on nullifier+action)

### Environment Variables (Server-Side Only)

`RP_SIGNING_KEY`, `RP_ID`, `APP_ID`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`, `AGENTKIT_WALLET_KEY`

### Key Implementation Notes

- World ID IDKit widget: `@worldcoin/idkit` React component — drop-in for verification flow
- Hedera escrow: simple HBAR transfer to platform escrow account (not HTS token) — simplest path for 30h
- No file upload: "Mark as Complete" is a button state change only

## Project Scoping & Phased Development

### MVP Strategy

**Approach:** Demo-first prototype — prove three bounty integrations end-to-end in 30 hours. Every build decision filtered through: "does this help us demo a bounty flow?"

**Team split:**
- **Sacha** — World ID integration (IDKit widget + server-side proof validation) + Hedera backend (escrow + payment release)
- **Pierre** — AI agent demo script (CLI) + Hedera testnet account setup
- **Florian** — API routes scaffolding, product orchestration, demo flow narrative
- **Noa** — UI/CSS only (task list, worker profile, task detail views)

All 4 use Claude Code as primary build accelerator.

**Build checkpoints:**
- **Hour 10:** Each P0 integration independently testable (World ID proof → 200 + nullifier stored; Hedera escrow TX on Hashscan; AgentKit verification → valid response)
- **Hour 20:** Full end-to-end flow in a single browser session
- **Hour 25:** Cut anything undone; polish demo script

### Hedera Escrow Architecture

**Platform-funded escrow account (server-side only):** Platform operates a single Hedera account with private key server-side. 
**Demo-Proof Deposit:** While real HBAR deposits are manual for MVP, the UI includes a "Simulate Deposit" button (visible in staging/demo) that triggers a real HBAR transfer + DB update instantly to ensure the demo flow never stalls. All Hedera transactions signed server-side by platform key — no wallet connect, no client-side signing.

### MVP Feature Priorities

| Capability | Bounty | Priority |
|-----------|--------|----------|
| World ID IDKit widget (worker registration) | World ID 4.0 | P0 |
| Server-side proof validation + nullifier storage | World ID 4.0 | P0 |
| AgentKit auth middleware on task creation | World AgentKit | P0 |
| Agent task creation API endpoint | World AgentKit | P0 |
| Hedera escrow lock on task creation | Hedera | P0 |
| Hedera payment release on validation | Hedera | P0 |
| Hashscan TX IDs in UI | Hedera | P0 |
| Task claim with nullifier check | Core flow | P1 |
| "Mark as Complete" button | Core flow | P1 |
| Client validation UI | Core flow | P1 |
| Task list view | Core flow | P1 |
| Admin Reset / Demo Loop Support | Core flow | P1 |
| Human client World ID verification | World ID 4.0 | P1.5 — if time permits |
| Reputation string indicator | Core flow | P2 |
| Auto-refund path (coded, manually triggerable) | Core flow | P2 |

**Explicit exclusions:** file upload, task search/filtering, notifications, mobile design, WebSocket, admin interface, dispute resolution.

### Post-MVP Roadmap

**Phase 2 (Growth):** Worker profile enrichment, task search/filtering, bilateral ratings, notifications, full Scheduled Transaction auto-refund, agent SDK docs, dashboard analytics.

**Phase 3 (Expansion):** On-chain arbitration, multi-currency (HBAR + stablecoins), portable reputation as verifiable credential, agent-to-agent delegation, HumanProof as protocol layer.

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| World ID RP signing key misconfiguration | Validate against staging on Day 0 before clock starts |
| Hedera TX async complexity | Simple HBAR transfer; poll for receipt with timeout |
| Team integration gaps | Hard checkpoints at H10 and H20 |
| Behind schedule | Cut P2 first, then P1.5; P0 is non-negotiable |

## Functional Requirements

### Identity & Human Verification

- **FR1:** A prospective worker can initiate a World ID 4.0 Orb verification flow to register as a verified human worker.
- **FR2:** The system can validate a World ID 4.0 proof server-side by calling the World verification API.
- **FR3:** The system can store a worker's World ID nullifier and enforce uniqueness per action — a second registration attempt with the same nullifier is rejected.
- **FR4:** A verified worker's profile displays a "Human Verified" badge indicating Orb-level verification.
- **FR5:** A human client can register and access the platform (World ID verification for human clients is P1.5 — optional for MVP).
- **FR6:** The system can generate RP signatures server-side for each IDKit verification session.

### Task Management

- **FR7:** A verified human client can create a task with a title, description, budget (HBAR), and deadline.
- **FR8:** An AI agent client can create a task via API with a title, description, budget, and deadline.
- **FR9:** A verified worker can view a unified list of available (unclaimed) tasks, regardless of whether they were created by a human client or an AI agent.
- **FR10:** A verified worker can view their own currently claimed task(s) and status.
- **FR11:** A client (human or agent) can view their own posted tasks and each task's current status.
- **FR12:** A verified worker can claim an available task — the system validates the worker's nullifier server-side before granting the claim.
- **FR13:** A claimed task is locked to the claiming worker — no other worker can claim it while in `claimed` status.
- **FR14:** A worker who has claimed a task can mark it as complete.
- **FR15:** A task client (human or agent) can validate a completed task submission.
- **FR16:** The system can release a claimed task back to `available` status if the worker does not submit completion before the deadline.
- **FR17:** A task that is not validated within its deadline can have its escrow refunded to the client (manually triggered for MVP; automatic post-MVP).
- **FR18:** A task progresses through defined statuses: `open → claimed → completed → validated` (or `→ expired → refunded`).

### Payment & Escrow

- **FR19:** A client can deposit HBAR into their platform balance (manual for MVP).
- **FR19.1:** (Demo Robustness) The system provides a "Simulate Deposit" feature for demo users to instantly fund their balance via a real HBAR transfer + DB update.
- **FR20:** The platform can lock HBAR in escrow at task creation using the platform's server-side Hedera account, maintaining the association between a task and its escrow TX ID.
- **FR21:** The platform can release escrowed HBAR to a worker's account upon task validation.
- **FR22:** The platform can refund escrowed HBAR to a client's platform balance upon deadline expiry.
- **FR23:** Each Hedera escrow lock and payment release produces a verifiable transaction ID linkable to Hashscan.
- **FR23.1:** (UI Feedback) The UI displays a "Processing Transaction..." state with a Hashscan link immediately upon submission to manage the 3-5s finality gap.
- **FR24:** Transaction IDs for escrow lock and payment release are surfaced in the task detail view once confirmed.
- **FR25:** A user can view their platform HBAR balance.

### Agent Integration

- **FR26:** The system can authenticate an AI agent client via World AgentKit middleware on task creation requests — agent-facing routes require a valid AgentKit header.
- **FR27:** The system verifies an agent's AgentBook registration and explicitly performs a lookup of the human owner's World ID to demonstrate bilateral cryptographic accountability.
- **FR28:** An unauthenticated or unregistered agent request is rejected with a clear error response.
- **FR29:** The agent task creation API returns a task ID and escrow TX ID upon successful task creation.
- **FR30:** An agent can poll task status via API to determine when to trigger validation.
- **FR31:** An agent can validate a completed task via direct API call (polling-triggered), bypassing fragile webhook callbacks for demo reliability.

### User Profiles & Reputation

- **FR32:** A verified worker has a profile page displaying their verification status and reputation indicator.
- **FR33:** The system increments a worker's task completion count upon successful task validation.
- **FR34:** A worker's reputation is displayed as a string indicator (e.g., "5 tasks completed") tied to their World ID nullifier.
- **FR35:** A worker's "Human Verified" status is visually distinguishable from unverified accounts in task listings.

### Platform, Session & Error Handling

- **FR36:** The system can generate and serve an RP context from a server-side API route for each verification session.
- **FR37:** Human-facing mutation routes require a valid World ID session — unauthenticated requests are rejected.
- **FR38:** The system maintains a user session after successful World ID verification, scoping subsequent requests to that verified identity.
- **FR39:** The system surfaces judge-friendly error states (e.g., "Human Already Registered" with reset/simulator instructions) for key failure scenarios.
- **FR40:** The system surfaces server-side validation logs and Hedera TX IDs in a format accessible during a demo.
- **FR41:** (Demo Robustness) The system includes a hidden `/admin` reset route to clear task statuses and refund the platform wallet, allowing for rapid demo looping.

## Non-Functional Requirements

### Performance

- **NFR1:** World ID proof validation round-trip (client → HumanProof backend → World API → response) completes within 5 seconds under normal network conditions.
- **NFR2:** Task list page renders within 500ms for up to 100 tasks.
- **NFR3:** Hedera transaction submission initiates within 2 seconds of a user action; confirmation display updates on receipt receipt (~3-5s Hedera finality).
- **NFR4:** All API mutation endpoints respond within 3 seconds (excluding external round-trips to World API and Hedera).
- **NFR5:** Task status polling interval is 3-5 seconds — acceptable latency for demo context.

### Security

- **NFR6:** The World ID RP signing key is stored exclusively as a server-side environment variable — never exposed client-side, in logs, or in source code.
- **NFR7:** The Hedera operator private key is stored exclusively as a server-side environment variable — never exposed client-side, in logs, or in source code.
- **NFR8:** All API routes that mutate state reject unauthenticated requests before executing any business logic.
- **NFR9:** World ID proof validation occurs server-side on every action that gates access — client-side proof acceptance is forbidden.
- **NFR10:** Nullifier uniqueness is enforced at the database level (`UNIQUE` constraint) — application-level checks alone are insufficient.
- **NFR11:** All client-to-backend communication occurs over HTTPS.
- **NFR12:** Environment secrets do not appear in the public GitHub repository — managed via `.env` and CI/CD secrets.

### Scalability

- **NFR13:** The system supports up to 5 concurrent sessions during hackathon judging without degradation.
- **NFR14:** Database schema supports up to 1,000 tasks and 500 users without schema changes (hackathon scope).

### Integration Reliability

- **NFR15:** If the World verification API is unreachable, the system returns a clear error and does not grant verification status (fail-closed).
- **NFR16:** If AgentBook verification is unreachable, agent task creation requests are rejected (fail-closed).
- **NFR17:** If a Hedera transaction fails or times out, the system surfaces the failure and does not assume payment was successful.
- **NFR18:** World ID credential expiry (`expires_at_min`) is checked — expired credentials are rejected with a clear message.

### Accessibility

- **NFR19:** Core flows (registration, task creation, task claim, validation) are keyboard-navigable.
- **NFR20:** Color contrast for primary UI elements meets WCAG 2.1 AA minimum (4.5:1 ratio).
