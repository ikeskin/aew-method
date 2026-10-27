# Role handoff and QA acceptance

Purpose: share evidence between Developer, QA and Reviewer through repository files; do not pretend separate AI processes were started. Follow this contract for code-changing feature and bugfix tasks, not for simple questions or documentation-only requests.

1. **Start**: Select one task ID in TASKS.md, record acceptance criteria and owner `developer`, state `in-progress`; STATE.md points to it. Avoid creating many microtasks.
2. **Developer -> QA**: When implementation is ready, set task state `qa-pending`, owner `qa`; append a concise entry to HANDOFFS.md with task ID, changed files, behavior/invariants, acceptance criteria, actual checks (or `not run`), known risks, and instructions to reproduce. Link validation evidence in VALIDATION.md. Do not claim QA approved.
3. **QA review**: Read handoff and affected source/tests, verify acceptance criteria independently, run focused tests where possible and check maintainability/security/tenant isolation as applicable. Record actual commands, environment, pass/fail/skip in VALIDATION.md. Append verdict `accepted`, `changes-requested`, or `blocked` with concrete evidence to HANDOFFS.md. QA must not rubber-stamp developer claims.
4. **QA -> Developer**: For `changes-requested`, set task state `rework`, owner `developer`; list reproducible findings. Developer fixes only the findings, then creates a new handoff round. For `blocked`, state `verification-blocked`, name missing prerequisite, request user approval if provisioning is needed; never silently skip essential verification.
5. **Completion**: Only after QA `accepted`, set task state `done`, owner `none`, update STATE.md and any consequential DECISIONS.md entry. A passing build alone is not QA acceptance.

Keep one current handoff record per transition, append instead of erasing prior verdicts. Use plain Markdown, not a service or external orchestrator. A single model may switch roles explicitly; independent QA requires a separately invoked reviewer/agent and must not be claimed otherwise. Do not read every historical handoff; inspect the active task only.

6. **Acceptance gate**: Before `done`, reconcile every criterion and open issue in .aew/gates.json and .aew/ISSUES.md, record QA verdict with evidence, then run `aew verify --task <task-id>`. A failing gate blocks completion; no silent exclusions.
