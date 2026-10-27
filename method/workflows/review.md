# Review workflow
1. Inspect changes and relevant surrounding code.
2. Prioritize correctness, behavior regressions, security, performance and maintenance risks.
3. Report actionable findings with file references, severity and verification steps.
4. Avoid speculative or style-only findings unless project policy requires them.

Apply project and technology profiles plus readability, comment and engineering-scope standards. Avoid unrelated reformatting and scope expansion.

Project continuity: consult `.aew/STATE.md` at start. Record an appropriately sized task in `.aew/TASKS.md`; update state at task boundaries. Append only actual test/build outcomes to `.aew/VALIDATION.md`, and significant accepted design decisions to `.aew/DECISIONS.md`. Apply `.aew/standards/code-organization.md`; tests passing do not waive maintainability review. Avoid unnecessary repeated reads or per-command state writes.
