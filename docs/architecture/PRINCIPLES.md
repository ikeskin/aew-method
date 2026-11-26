# AEW architecture principles

Status: owner-approved direction, 2026-11-26; not an implemented runtime guarantee.

- One logical Manager per execution session owns orchestration, commands, task allocation, context distribution and state transitions.
- Agents cannot communicate directly or through uncontrolled shared files, queues, processes, network or provider-native subagents. No agent may launch or assign another agent. Manager-mediated, validated artifacts are permitted; arbitrary message forwarding is not.
- Deny by default; enforce identity and permissions outside prompts. Unsupported isolation must prevent managed execution.
- Agents report requests, status, errors and results; only Manager accepts results or transitions tasks. Human remains final authority for decisions requiring approval.
- Provider-neutral contracts, traceability and executable evidence are required. Keep implementation proportional and avoid mandatory external infrastructure.

See [Manager](MANAGER.md), [Protocol](PROTOCOL.md), [Decisions](DECISIONS.md), [Dashboard](DASHBOARD.md), [Roadmap](../ROADMAP.md).

Compatibility: v0.5.9 is instruction-based and cannot claim these runtime guarantees. Existing CLI workflows remain valid; managed execution is a proposed separate capability.
