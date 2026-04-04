# Deferred Work

## Deferred from: code review of 1-2-worker-registration-with-idkit-widget.md (2026-04-04)

- Feature Flags exposés dans le bundle client [src/components/identity/RegisterWidget.tsx:11] : La variable `isMock` est évaluée côté client via `process.env`, ce qui inclut la logique de démo dans le bundle de production.
