# Roadmap: managed execution design

Status: proposed, 2026-11-26. Existing v0.5.9 instruction-based CLI remains supported; no claim of implemented orchestration. Align with existing release plans before choosing version.

P0 acceptance checklist:
- [ ] Verify official provider documentation and experimentally test isolation for Codex, Claude and Gemini; reject unsupported managed adapters.
- [ ] Define provider-neutral validated message and command schemas.
- [ ] Implement Manager deterministic state machine, identity, scoped context and deny-by-default execution.
- [ ] Implement versioned decisions, human approval and atomic dependency transitions.
- [ ] Evaluate SQLite schema, concurrency, migrations and restart reconciliation.
- [ ] Add dashboard task/request/decision cards, persisted events and reconnect.
- [ ] Test direct peer messaging, shared file bypass, nested process/agent launch, unauthorized network/IPC and identity spoofing; all must fail within the supported threat model.
- [ ] Test stale/duplicate approvals, blocked tasks, restart during execution, unsupported pause/resume, verification failures and dashboard disconnect.
- [ ] Preserve existing CLI workflows and executable QA checks; run regression tests.

Defer broker, distributed orchestration and advanced analytics until justified. Do not introduce mandatory external services or second-person approval for existing CLI usage.

See [architecture principles](architecture/PRINCIPLES.md).
