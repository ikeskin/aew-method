# Security Quality Gate

Use risk-based security verification for changed behavior. For web/API changes inspect authentication, authorization, tenant isolation, untrusted input and SQL injection, secret leakage, error disclosure, and relevant dependency advisories. Include concurrency and privilege boundaries when applicable. Do not claim a scan or test ran without command/output evidence.

Record security findings in `.aew/ISSUES.md` and structured `.aew/gates.json` with ID, severity (critical/high/medium/low), status, impact, blocking flag and evidence. Critical/high open findings always block QA acceptance. Human approval is required for explicit risk acceptance; an agent must not approve its own risk. Never silently downgrade severity or scope to pass a gate.

Use OWASP ASVS as a reference where relevant, not a mandatory exhaustive checklist for every task. Report `not-run`, `blocked`, and `failed` separately from `passed`. Missing security tooling is not a passing scan; ask for approval before installing critical missing tools.
