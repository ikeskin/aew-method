# Architecture decision register

Date: 2026-11-26. IDs are documentation identifiers, not live runtime records.

## ADR-001: Manager-only orchestration
Status: Accepted direction (explicit owner instruction).
Agents cannot communicate with peers or launch/assign peers; Manager is the only coordinator. Enforce in runtime, not prompts. Consequence: incompatible adapters must fail closed.

## ADR-002: Deterministic Manager with optional LLM planning
Status: Proposed. Separate enforcement from probabilistic suggestions, minimize token use.

## ADR-003: SQLite persistence
Status: Proposed; chosen as example scenario for design, not verified production approval. Local transactions and restart recovery without external service. Revisit for multi-host coordination. Suggested tables: sessions, agents, tasks, messages, decisions, task_dependencies; schema subject to review.

Decision state: proposed, pending, approved, rejected, revision_required, superseded. Execution state tracked separately. Approval binds decision ID, revision, option ID, task scope and authenticated authority. Stale approvals fail; duplicate submissions are idempotent. Save approval, dependency transition and audit event atomically. Block dependent tasks until approval; unrelated tasks may proceed. An approved decision is not an implemented decision.

Example: Architect proposes SQLite -> Manager creates pending decision -> human approves exact revision -> Manager schedules Developer -> Developer reports artifacts -> Manager verifies actual test evidence -> Manager marks task complete. Example is illustrative, not a recorded production approval.

## ADR-004: Human approval and evidence
Status: Proposed policy details. Critical decisions require human approval, with explicit risk rules; Manager may resolve policy-authorized routine decisions. No agent can self-approve its own result.
