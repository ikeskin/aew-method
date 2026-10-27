# Feature workflow
1. Discover current implementation and affected modules.
2. Identify intent, domain invariants, compatibility and edge cases; ask only blocking questions.
3. Propose smallest solution and acceptance tests; request approval for consequential design choices.
4. Implement focused change and tests.
5. Run checks. If required tools or integration services are missing, ask for specific provisioning approval and pause blocked verification until the user decides. Report actual checks, diffs, risks and blocked items; do not declare acceptance complete while a critical test is blocked.

Apply project and technology profiles plus readability, comment and engineering-scope standards. Avoid unrelated reformatting and scope expansion.

Project continuity: consult `.aew/STATE.md` at start. Record an appropriately sized task in `.aew/TASKS.md`; update state at task boundaries. Append only actual test/build outcomes to `.aew/VALIDATION.md`, and significant accepted design decisions to `.aew/DECISIONS.md`. Apply `.aew/standards/code-organization.md`; tests passing do not waive maintainability review. Avoid unnecessary repeated reads or per-command state writes.

Role transition: follow `.aew/standards/handoff.md`. Developer hands off evidence to QA; QA independently verifies and either accepts, blocks or returns findings. Do not mark a code task done without QA acceptance.

Before declaring done, reconcile criteria and open issues; follow .aew/standards/acceptance.md and .aew/standards/security.md and run aew verify for the task.
