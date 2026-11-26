# AEW v0.6 proposal: Manager-led orchestration

Status: proposed; implementation and runtime validation pending.

## Purpose
AEW remains a model-agnostic engineering methodology, installer and executable verification layer, not a replacement agent runtime. The host's root agent acts as Manager; the human retains product ownership. Start with Codex native subagents; preserve existing Claude and Gemini adapters until their native delegation is validated independently.

## Manager policy
Understand the request and acceptance criteria. Ask only for consequential unresolved requirements. Inspect existing architecture and choose the smallest effective execution path. Answer simple questions directly; delegate implementation to a developer when useful. Activate analyst for ambiguity, architect for consequential design decisions, UX for user-facing design, QA for behavioral verification, and reviewer for material code risks. Never launch every role by default. Reuse existing role skills on demand. Avoid unnecessary abstractions and preserve repository conventions. Treat agent outputs as claims until verified.

## Execution contract
Each delegated task must contain objective, scope, relevant context, allowed files/actions, acceptance criteria and expected evidence. Parallelize independent read-only work; serialize overlapping writes or isolate workspaces. Manager owns shared task records and integrates results. Do not delegate recursively by default. Proposed initial limits: three concurrent children, depth one, at most two remediation rounds per task; stop and report blockers rather than retry indefinitely. These limits must be enforced by the host where supported; instructions alone are not enforcement.

## Compatibility and quality
Keep v0.5.9 light/standard/strict policies, existing skills, task JSON and checksum-based upgrade protections. Do not overwrite custom AGENTS.md or other host configuration. Keep executable verification independent: run aew verify where required and report actual exit status; never treat an agent's assertion as passing tests. Preserve user approval boundaries and prohibit weakening tests to pass gates. If native subagents are unavailable, disclose fallback to single-agent execution and never claim delegation occurred.

## Implementation sequence
- [ ] Inspect current installer, templates, skills and tests; identify exact integration points.
- [ ] Verify Codex CLI native agent configuration against current official documentation and installed version.
- [ ] Add short manager policy to managed Codex entrypoint and install native role definitions with safe merge/upgrade behavior.
- [ ] Reuse existing role skills; avoid loading all instructions into every context.
- [ ] Add capability detection, fallback diagnostics and tests for installation, upgrades and custom configuration preservation.
- [ ] Validate real native delegation on a small project; record actual agent invocations and verification evidence.
- [ ] Compare successful-task cost, token usage, elapsed time, rework and regressions against v0.5.9 using equivalent tasks.
- [ ] Document supported hosts and limitations before release; bump version only after acceptance.

## Acceptance scenarios
1. Simple question: no child agent.
2. Small bug: developer only if delegation adds value; actual tests run.
3. Ambiguous feature: analyst engaged only if needed; consequential ambiguities escalated.
4. Architectural change: architect precedes dependent implementation; independent review for risk.
5. Parallel read-only tasks: no overlapping writes; manager consolidates evidence.
6. Failed tests: bounded remediation, then explicit failure.
7. Unsupported native delegation: honest single-agent fallback.
8. Upgrade: existing custom files preserved; no silent overwrite.

## Non-goals
No custom agent loop, new server, database, OpenHands dependency, mandatory multi-agent pipeline, automatic production deployment or model lock-in in this phase.
