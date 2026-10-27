# Feature workflow
1. Discover current implementation and affected modules.
2. Identify intent, domain invariants, compatibility and edge cases; ask only blocking questions.
3. Propose smallest solution and acceptance tests; request approval for consequential design choices.
4. Implement focused change and tests.
5. Run checks. If required tools or integration services are missing, ask for specific provisioning approval and pause blocked verification until the user decides. Report actual checks, diffs, risks and blocked items; do not declare acceptance complete while a critical test is blocked.

Apply project and technology profiles plus readability, comment and engineering-scope standards. Avoid unrelated reformatting and scope expansion.

Project continuity: in light mode use relevant context only; do not create or update shared STATE.md, TASKS.md, gates.json, HANDOFFS.md or VALIDATION.md for a small change. In standard/strict mode, use `.aew/tasks/AEW-<ID>.json` as the authoritative per-task record; update shared summaries only by explicit agreement to avoid branch conflicts. Record consequential decisions only. Follow code-organization guidance; tests passing do not waive maintainability review.

Role transition: QA is a responsibility, not necessarily a separate agent. Light mode requires no handoff paperwork. For tracked standard/strict work, record actual verification and unresolved risks in the task record; do not claim an independent review unless it happened.

Before declaring verified, report any missing checks, changed tests or risk warnings. Use `aew verify` for actual execution; do not claim automatic enforcement of a verify hook.
