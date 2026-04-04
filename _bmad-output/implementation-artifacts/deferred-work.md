# Deferred Work

## Deferred from: code review of 1-2-worker-registration-with-idkit-widget.md (2026-04-04)

- Feature Flags exposés dans le bundle client [src/components/identity/RegisterWidget.tsx:11] : La variable `isMock` est évaluée côté client via `process.env`, ce qui inclut la logique de démo dans le bundle de production.
## Deferred from: code review of story-3.x (2026-04-04)\n\n- Aggressive polling on task list (5s): Intentional for hackathon demo but should be configurable or increased for production.\n- Non-Atomic Escrow and Database State: Hedera escrow is locked before DB transaction. Success depends on subsequent DB transaction success.\n- Task List Performance Degradation: Lacks pagination or limits. Fetching all open tasks will scale poorly.

## Deferred from: code review of story-1.4 (2026-04-04)
- Redirection Client (Flash UI) [src/app/profile/page.tsx] — flash du contenu avant redirection.
