# Acceptance & Open Issues Gate

For each standard or strict tracked task, record observable acceptance criteria, owner, and state in TASKS.md. Maintain matching machine-readable records in `.aew/gates.json` (see README schema). ISSUES.md records human-readable open issues; never delete unresolved findings to make a task appear complete.

Each mandatory criterion needs `status: passed` plus real verification `evidence`; failed, blocked, skipped, not-run and unverified are not passed. A separate reviewer, when available, records `qa.verdict: accepted` and evidence after reviewing code, tests, maintainability and relevant security risks. An open issue blocks completion unless explicitly nonblocking and below high severity. A resolved issue needs verification evidence; accepted risks require explicit human approval and rationale.

Run `aew verify --task AEW-001` before marking work complete; `aew verify` checks all tracked tasks and exits nonzero when any gate is not satisfied. This is a consistency gate over self-reported evidence; `recorded-only` is not independent verification, **not** a substitute for running tests or a security scanner. Keep STATE.md, TASKS.md, HANDOFFS.md, VALIDATION.md, ISSUES.md and gates.json synchronized. Existing repos require updated agent instructions; init never overwrites user files.
