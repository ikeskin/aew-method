# Manager

Status: proposed implementation of approved isolation principle.

A deterministic core owns identity, policy, command validation, scheduling, dependencies, state, persistence and evidence acceptance. Optional LLM planning/evaluation produces proposals only; it never bypasses policy. Routine status events do not trigger LLM calls.

Agent -> Manager: reports and requests. Manager -> Agent: validated commands and scoped context. Human -> Manager: authorized decisions and interventions. Dashboard reads Manager state; no direct database mutation.

Isolation: distinct task workspace/process identity, deny peer IPC and uncontrolled network, restrict tool/shell capabilities, prevent nested agent launches, protect credentials and Manager storage. Manager imports reviewed artifacts into task context; it does not transparently relay agent messages. Fail closed when adapter cannot enforce required isolation. Absolute elimination of covert channels is not claimed.

Task states: queued, ready, running, blocked, verifying, completed, failed, cancelled, interrupted. Manager validates transitions and dependencies. A result is a claim until checked against independent evidence. Restart must reconcile interrupted external effects before retrying; use idempotency keys and checkpoints. Resume depends on provider capability.

Proposed storage: SQLite owned exclusively by Manager, transactional state and append-only audit records; no separate broker initially.
