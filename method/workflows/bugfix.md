# Bugfix workflow
1. Reproduce or identify observable failure and expected behavior.
2. Trace root cause; distinguish evidence from guesses.
3. Add a focused regression test where practical.
4. Apply minimal fix, verify nearby behavior and report results.

Apply project and technology profiles plus readability, comment and engineering-scope standards. Avoid unrelated reformatting and scope expansion.

Project continuity: consult `.aew/STATE.md` at start. Record an appropriately sized task in `.aew/TASKS.md`; update state at task boundaries. Append only actual test/build outcomes to `.aew/VALIDATION.md`, and significant accepted design decisions to `.aew/DECISIONS.md`. Apply `.aew/standards/code-organization.md`; tests passing do not waive maintainability review. Avoid unnecessary repeated reads or per-command state writes.

Role transition: follow `.aew/standards/handoff.md`. Developer hands off evidence to QA; QA independently verifies and either accepts, blocks or returns findings. Do not mark a code task done without QA acceptance.

Before declaring done, reconcile criteria and open issues; follow .aew/standards/acceptance.md and .aew/standards/security.md and run aew verify for the task.
